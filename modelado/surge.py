"""
Generador del ratón 3D (forma basada en el HyperX Pulsefire Surge).

Ejecutar (desde la raíz del proyecto):
    blender --background --factory-startup --python modelado/surge.py -- <salida.glb> [carpeta_renders]
    blender --background --factory-startup --python modelado/surge.py -- modelado/raton.blend
La segunda forma guarda el modelo denso (en metros) para `modelado/render.py`.

Todo se construye en milímetros a partir de cotas medidas sobre fotos de
referencia (vista lateral oficial, cenital, frontal y trasera):
    largo 120 mm · ancho 63 mm · alto 41 mm · joroba a 69 mm de la nariz.

Proceso:
  1. Loft del cuerpo exterior con secciones verticales (planta, perfil,
     suelo y superelipse variable) → remallado por vóxeles (malla cerrada).
  2. Cuerpo hueco (pared de 1,8 mm) partido por la línea de la tira RGB: carcasa
     superior (cubierta + botones), carcasa inferior (flancos + base) y la
     propia tira, rehundida.
  3. Detalles por booleanas: ranura central, pozo de la rueda, bandeja
     brillante, botón DPI con chevrón, dos botones laterales en el flanco
     izquierdo con su rebaje, patines, ventana del sensor, etiqueta,
     puerto USB-C y logotipo.
  4. Rueda con tacos de goma y exportación GLB
     (Y arriba, nariz hacia +Z, escala de la escena).
"""

import bisect
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SALIDA = os.path.abspath(ARGS[0]) if ARGS else os.path.abspath('raton.glb')
RENDERS = os.path.abspath(ARGS[1]) if len(ARGS) > 1 else None

# Escena de three: nariz en z = 0.622, cola en z = -0.542 (1.164 u = 120 mm).
ESCALA = 1.164 / 120.0
NARIZ_MM = 0.622 / ESCALA  # desplazamiento de la nariz desde el origen, en mm
VOXEL = 0.32


# ---------------------------------------------------------------- utilidades
def pchip(tabla):
    """Interpolador monótono (sin sobreoscilaciones) de una tabla (x, y)."""
    xs = [p[0] for p in tabla]
    ys = [p[1] for p in tabla]
    n = len(xs)
    h = [xs[i + 1] - xs[i] for i in range(n - 1)]
    d = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    m = [0.0] * n
    m[0], m[-1] = d[0], d[-1]
    for i in range(1, n - 1):
        if d[i - 1] * d[i] <= 0:
            m[i] = 0.0
        else:
            w1 = 2 * h[i] + h[i - 1]
            w2 = h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])

    def f(x):
        if x <= xs[0]:
            return ys[0]
        if x >= xs[-1]:
            return ys[-1]
        i = bisect.bisect_right(xs, x) - 1
        t = (x - xs[i]) / h[i]
        return (
            (2 * t**3 - 3 * t**2 + 1) * ys[i]
            + (t**3 - 2 * t**2 + t) * h[i] * m[i]
            + (-2 * t**3 + 3 * t**2) * ys[i + 1]
            + (t**3 - t**2) * h[i] * m[i + 1]
        )

    return f


def P(x, z, h):
    """Punto en mm (x lateral, z desde la nariz, h altura) → coords Blender."""
    return Vector((x, z - NARIZ_MM, h))


def malla(nombre, verts, caras):
    me = bpy.data.meshes.new(nombre)
    me.from_pydata([tuple(v) for v in verts], [], caras)
    me.validate()
    me.update()
    ob = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def triangular(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(ob.data)
    bm.free()


def aplicar(ob):
    """Aplica la pila de modificadores sin depender del contexto de la UI."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    nueva = bpy.data.meshes.new_from_object(ev)
    vieja = ob.data
    ob.modifiers.clear()
    ob.data = nueva
    if vieja.users == 0:
        bpy.data.meshes.remove(vieja)
    return ob


def copia(ob, nombre=None):
    c = ob.copy()
    c.data = ob.data.copy()
    c.name = nombre or ob.name + '_c'
    bpy.context.scene.collection.objects.link(c)
    return c


def borrar(*obs):
    for ob in obs:
        me = ob.data
        bpy.data.objects.remove(ob)
        if isinstance(me, bpy.types.Mesh) and me.users == 0:
            bpy.data.meshes.remove(me)


SOLVER = 'MANIFOLD'


def booleana(a, b, op, conservar=False):
    global SOLVER
    m = a.modifiers.new('bool', 'BOOLEAN')
    m.operation = op
    m.object = b
    try:
        m.solver = SOLVER
    except TypeError:
        SOLVER = 'EXACT'
        m.solver = SOLVER
    aplicar(a)
    if not conservar:
        borrar(b)
    return a


def remallar(ob, voxel=VOXEL):
    m = ob.modifiers.new('remesh', 'REMESH')
    m.mode = 'VOXEL'
    m.voxel_size = voxel
    m.adaptivity = 0.0
    m.use_smooth_shade = True
    return aplicar(ob)


def desplazar(ob, distancia):
    """Desplaza la superficie a lo largo de su normal (negativo = hacia dentro)."""
    m = ob.modifiers.new('disp', 'DISPLACE')
    m.direction = 'NORMAL'
    m.mid_level = 0.0
    m.strength = distancia
    return aplicar(ob)


def prisma(nombre, poligono, eje, a, b):
    """Extruye un polígono 2D cerrado.

    eje='h': polígono en (x, z) extruido en altura de a a b.
    eje='x': polígono en (z, h) extruido en x de a a b.
    eje='z': polígono en (x, h) extruido en z de a a b.
    """
    n = len(poligono)
    verts = []
    for valor in (a, b):
        for u, v in poligono:
            if eje == 'h':
                verts.append(P(u, v, valor))
            elif eje == 'x':
                verts.append(P(valor, u, v))
            else:
                verts.append(P(u, valor, v))
    caras = [list(range(n)), list(range(2 * n - 1, n - 1, -1))]
    for i in range(n):
        j = (i + 1) % n
        caras.append([i, j, n + j, n + i])
    ob = malla(nombre, verts, caras)
    # Garantiza normales hacia fuera sea cual sea el sentido del polígono.
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(ob.data)
    bm.free()
    return ob


def chaikin(poligono, iteraciones=3):
    """Redondea las esquinas de un polígono cerrado."""
    for _ in range(iteraciones):
        nuevo = []
        n = len(poligono)
        for i in range(n):
            p = poligono[i]
            q = poligono[(i + 1) % n]
            nuevo.append((0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]))
            nuevo.append((0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]))
        poligono = nuevo
    return poligono


def rect_redondeado(cx, cy, ancho, alto, radio, pasos=10):
    pts = []
    hx, hy = ancho / 2 - radio, alto / 2 - radio
    for k, (sx, sy, a0) in enumerate(((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270))):
        for i in range(pasos + 1):
            a = math.radians(a0 + 90 * i / pasos)
            pts.append((cx + sx * hx + radio * math.cos(a), cy + sy * hy + radio * math.sin(a)))
    return pts


# ---------------------------------------------------------- cotas medidas (mm)
# Altura de la cresta (silueta lateral) a lo largo del largo, desde la nariz.
H = pchip([
    (0, 12.0), (1.7, 15.4), (5, 17.5), (8.4, 19.5), (11.8, 21.4), (15.1, 23.2),
    (18.5, 25.0), (21.9, 26.7), (25.2, 28.3), (28.6, 30.0), (32, 31.6),
    (35.3, 33.0), (38.7, 34.3), (42, 35.7), (45.4, 36.8), (48.8, 37.8),
    (52.1, 38.9), (55.5, 39.6), (58.9, 40.2), (62.2, 40.7), (65.6, 41.0),
    (69, 41.1), (72.3, 41.0), (75.7, 40.7), (79, 40.1), (82.4, 39.4),
    (85.8, 38.4), (89.1, 37.1), (92.5, 35.4), (95.9, 33.6), (99.2, 31.4),
    (102.6, 28.7), (106, 25.8), (109.3, 22.4), (112.7, 18.5), (116, 14.0),
    (118.5, 10.6), (120, 9.0),
])
# Línea de apoyo: la base se levanta en la nariz y se redondea en la cola.
HB = pchip([
    (0, 5.0), (1.7, 2.6), (5, 1.5), (8.4, 0.7), (12, 0.15), (16, 0.0),
    (110, 0.0), (112.7, 1.5), (116, 4.3), (118.5, 7.0), (120, 9.0),
])
# Planta: media anchura máxima (vista cenital).
W = pchip([
    (0, 0.0), (0.4, 9.6), (1.5, 13.6), (2.6, 16.9), (3.7, 19.9), (4.8, 22.3),
    (5.9, 24.5), (7, 26.4), (8.1, 27.6), (9.2, 28.5), (10.3, 29.2),
    (11.4, 29.8), (12.5, 30.1), (13.6, 30.4), (15.8, 30.55), (25, 30.6),
    (35, 30.5), (45, 30.65), (55, 31.0), (65, 31.3), (75, 31.5), (85, 31.5),
    (90, 31.35), (92, 31.2), (94.1, 30.7), (96.3, 30.0), (98.5, 29.0),
    (100.7, 28.0), (102.9, 26.7), (105.1, 25.2), (107.4, 23.4), (109.6, 21.2),
    (111.8, 18.8), (114, 16.0), (116.2, 12.8), (117.3, 10.8), (118.4, 8.2),
    (119.5, 3.8), (120, 0.0),
])
# Altura de la anchura máxima y exponente de la superelipse (techo).
H0 = pchip([(0, 12.0), (80, 12.0), (100, 10.0), (112, 8.0), (120, 8.0)])
EXP = pchip([(0, 2.9), (20, 2.6), (40, 2.25), (58, 1.95), (75, 1.85), (95, 2.0), (110, 2.2), (120, 2.4)])
# Valle central entre los dos botones principales.
VALLE = pchip([(0, 0.6), (30, 0.6), (48, 0.0), (120, 0.0)])
# Cuenco de cada botón: el centro se hunde y se une al flanco en una arista
# viva (el pliegue que recorre los dos botones de delante atrás).
CUENCO = pchip([(0, 1.5), (20, 1.3), (40, 0.7), (56, 0.0), (120, 0.0)])
PLIEGUE = pchip([(0, 0.66), (25, 0.6), (45, 0.52), (60, 0.5), (120, 0.5)])
# Tira RGB: altura de su eje a lo largo del flanco (vista lateral oficial).
TIRA = pchip([
    (0, 8.3), (8.4, 8.3), (11.8, 9.6), (15.1, 11.1), (18.5, 12.9), (21.9, 14.6),
    (25.2, 16.3), (28.6, 17.9), (32, 19.6), (35.3, 21.2), (38.7, 22.8),
    (42, 24.2), (45.4, 25.6), (48.8, 26.8), (52.1, 27.8), (55.5, 28.7),
    (58.9, 29.5), (62.2, 30.2), (65.6, 30.5), (69, 30.7), (72.3, 30.7),
    (75.7, 30.5), (79, 29.9), (82.4, 29.1), (85.8, 28.1), (89.1, 26.9),
    (92.5, 25.3), (95.9, 23.5), (99.2, 21.4), (102.6, 18.9), (106, 16.0),
    (109.3, 12.8), (112.7, 8.6), (116, 6.6), (125, 6.5),
])
MEDIA_TIRA = 1.1  # mitad del alto visible de la tira

# Rueda y pozo.
RUEDA_Z, RUEDA_H, RUEDA_R, RUEDA_ANCHO = 18.5, 19.0, 10.0, 6.8
POZO = (9.6, 45.0, 8.6)  # z inicio, z fin, ancho
DPI = (31.8, 43.6, 6.2)


def seccion(z):
    w = max(W(z), 0.02)
    hc = H(z)
    hb = HB(z)
    n = EXP(z)
    h0 = min(H0(z), hb + 0.55 * (hc - hb))
    hueco = min(6.0, 0.4 * w, 1.2 * (h0 - hb))
    v = VALLE(z)
    pts = []
    k1, k2, k4 = 22, 132, 14
    for i in range(k1):
        u = i / k1
        pts.append((w - hueco * (1 - u) ** 1.8, hb + (h0 - hb) * u))
    for j in range(k2 + 1):
        t = math.pi * j / k2
        c, s = math.cos(t), math.sin(t)
        x = w * math.copysign(abs(c) ** (2 / n), c)
        hh = h0 + (hc - h0) * abs(s) ** (2 / n)
        hh -= v * math.exp(-((x / 6.5) ** 2)) * abs(s) ** 6
        xc = PLIEGUE(z) * w
        if abs(x) < xc:
            hh -= CUENCO(z) * (1 - (x / xc) ** 2)
        pts.append((x, hh))
    for i in range(1, k1 + 1):
        u = 1 - i / k1
        pts.append((-(w - hueco * (1 - u) ** 1.8), hb + (h0 - hb) * u))
    for i in range(1, k4):
        x = -(w - hueco) + 2 * (w - hueco) * i / k4
        pts.append((x, hb))
    return pts


def construir_cuerpo():
    n = 320
    zs = [120 * (1 - math.cos(math.pi * i / n)) / 2 for i in range(n + 1)]
    zs = [min(max(z, 0.06), 119.9) for z in zs]
    verts, caras = [], []
    m = None
    for z in zs:
        sec = seccion(z)
        m = len(sec)
        verts.extend(P(x, z, h) for x, h in sec)
    for i in range(n):
        for j in range(m):
            a = i * m + j
            b = i * m + (j + 1) % m
            caras.append([a, (i + 1) * m + j, (i + 1) * m + (j + 1) % m, b])
    caras.append(list(range(m - 1, -1, -1)))
    caras.append([n * m + j for j in range(m)])
    ob = malla('Cuerpo', verts, caras)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(ob.data)
    bm.free()
    remallar(ob)
    # El remate de la cola junta secciones diminutas y el vóxel deja grumos:
    # se alisan solo en esa zona (el resto conserva el pliegue de los botones).
    grupo = ob.vertex_groups.new(name='cola')
    for v in ob.data.vertices:
        z = v.co.y + NARIZ_MM
        t = min(1.0, max(0.0, (z - 108.0) / 8.0))
        if t > 0:
            grupo.add([v.index], t * t * (3 - 2 * t), 'REPLACE')
    m = ob.modifiers.new('alisar', 'SMOOTH')
    m.factor = 0.9
    m.iterations = 30
    m.vertex_group = 'cola'
    return aplicar(ob)


def losa(nombre, desfase):
    """Sólido 'todo lo que queda por debajo de la tira (+desfase)'."""
    zs = [-6 + i * 0.5 for i in range(0, 271)]
    poligono = [(z, TIRA(z) + desfase) for z in zs] + [(zs[-1], -20), (zs[0], -20)]
    return prisma(nombre, poligono, 'x', -50, 50)


def capa_frontal(cuerpo, distancia, extra, nombre):
    """Como capa_desplazada, pero con un rehundido extra en la nariz: la
    base y la tira quedan bajo el labio voladizo de los botones."""
    c = copia(cuerpo, nombre)
    grupo = c.vertex_groups.new(name='nariz')
    for v in c.data.vertices:
        z = v.co.y + NARIZ_MM
        t = min(1.0, max(0.0, (z - 2.5) / 12.0))
        grupo.add([v.index], 1 - t * t * (3 - 2 * t), 'REPLACE')
    if distancia:
        m = c.modifiers.new('d0', 'DISPLACE')
        m.direction, m.mid_level, m.strength = 'NORMAL', 0.0, distancia
    m = c.modifiers.new('d1', 'DISPLACE')
    m.direction, m.mid_level, m.strength = 'NORMAL', 0.0, extra
    m.vertex_group = 'nariz'
    return aplicar(c)


def capa_desplazada(cuerpo, distancia, nombre):
    c = copia(cuerpo, nombre)
    return desplazar(c, distancia)


# ------------------------------------------------------------------ modelado
def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    cuerpo = construir_cuerpo()
    print('cuerpo', len(cuerpo.data.polygons))

    # Cuerpo hueco: pared de 1,8 mm.
    hueco = copia(cuerpo, 'Hueco')
    booleana(hueco, capa_desplazada(cuerpo, -1.8, 'Capa18'), 'DIFFERENCE')

    # --- Carcasa superior (todo lo que queda por encima de la tira)
    sup = copia(hueco, 'CarcasaSuperior')
    booleana(sup, losa('LosaAlta', MEDIA_TIRA), 'DIFFERENCE')

    # --- Carcasa inferior (flancos + base)
    inf = capa_frontal(cuerpo, 0.0, -1.3, 'CarcasaInferior')
    booleana(inf, capa_frontal(cuerpo, -1.8, -1.3, 'CapaInf'), 'DIFFERENCE')
    booleana(inf, losa('LosaBaja', -MEDIA_TIRA), 'INTERSECT')

    # --- Tira RGB: banda rehundida 0,8 mm entre ambas carcasas
    tira = capa_frontal(cuerpo, -0.8, -1.3, 'TiraRGB')
    booleana(tira, capa_frontal(cuerpo, -2.4, -1.3, 'Capa24'), 'DIFFERENCE')
    booleana(tira, losa('LosaTiraA', MEDIA_TIRA), 'INTERSECT')
    booleana(tira, losa('LosaTiraB', -MEDIA_TIRA), 'DIFFERENCE')
    borrar(hueco)

    # --- Ranura entre botones (de la nariz al pozo de la rueda)
    ranura = prisma('Ranura', rect_redondeado(0, (POZO[0] - 4) / 2, 0.7, POZO[0] + 4, 0.3, 3), 'h', 4, 60)
    booleana(sup, ranura, 'DIFFERENCE')

    # --- Pozo de la rueda y del botón DPI
    pozo_poli = rect_redondeado(0, (POZO[0] + POZO[1]) / 2, POZO[2], POZO[1] - POZO[0], 3.2)
    booleana(sup, prisma('Pozo', pozo_poli, 'h', 10, 60), 'DIFFERENCE')

    # --- Bandeja brillante bajo el pozo, con hueco para la rueda
    capa22 = capa_desplazada(cuerpo, -2.2, 'Capa22')
    capa38 = capa_desplazada(cuerpo, -3.8, 'Capa38')
    bandeja = copia(capa22, 'Bandeja')
    booleana(bandeja, prisma('BandejaPrisma', rect_redondeado(0, (POZO[0] + POZO[1]) / 2, POZO[2] + 2.4, POZO[1] - POZO[0] + 2.4, 4), 'h', 10, 60), 'INTERSECT')
    booleana(bandeja, capa38, 'DIFFERENCE', conservar=True)
    hueco_rueda = prisma('HuecoRueda', rect_redondeado(0, RUEDA_Z, RUEDA_ANCHO + 1.4, 2 * RUEDA_R + 2.0, 2.0), 'h', 0, 60)
    booleana(bandeja, hueco_rueda, 'DIFFERENCE')

    # --- Botón DPI: tecla brillante a ras de la cubierta con chevrón grabado
    capa05 = capa_desplazada(cuerpo, -0.5, 'Capa05')
    dpi = copia(capa05, 'BotonDPI')
    booleana(dpi, prisma('DPIPrisma', rect_redondeado(0, (DPI[0] + DPI[1]) / 2, DPI[2], DPI[1] - DPI[0], 1.6), 'h', 10, 60), 'INTERSECT')
    booleana(dpi, copia(capa22, 'Capa22b'), 'DIFFERENCE')
    zc = DPI[0] + 0.62 * (DPI[1] - DPI[0])
    chevron = [(-2.3, zc - 2.2), (0, zc), (2.3, zc - 2.2), (2.3, zc - 1.2), (0, zc + 1.0), (-2.3, zc - 1.2)]
    surco = prisma('Chevron', chevron, 'h', 10, 60)
    capa09 = capa_desplazada(cuerpo, -0.9, 'Capa09')
    booleana(surco, capa09, 'DIFFERENCE')
    surco_real = surco
    booleana(dpi, surco_real, 'DIFFERENCE')

    # --- Botones laterales (flanco izquierdo = +x)
    def poligono_lateral(z0, z1, inclinacion_ini, inclinacion_fin, crece=0.0):
        arriba = lambda z: TIRA(z) - MEDIA_TIRA - 1.6
        abajo = lambda z: TIRA(z) - MEDIA_TIRA - 9.2
        pts = []
        pasos = 10
        # borde superior (de delante atrás)
        for i in range(pasos + 1):
            z = z0 + inclinacion_ini + (z1 + inclinacion_fin - z0 - inclinacion_ini) * i / pasos
            pts.append((z, arriba(z)))
        # borde inferior (de atrás adelante)
        for i in range(pasos + 1):
            z = z1 - (z1 - z0) * i / pasos
            pts.append((z, abajo(z)))
        pts = chaikin(pts, 3)
        if crece:
            cz = sum(p[0] for p in pts) / len(pts)
            ch = sum(p[1] for p in pts) / len(pts)
            pts2 = []
            for z, h in pts:
                dz, dh = z - cz, h - ch
                d = math.hypot(dz, dh) or 1
                pts2.append((z + dz / d * crece, h + dh / d * crece))
            pts = pts2
        return pts

    laterales = [
        ('BotonLateralDelantero', 38.6, 53.2, 2.2, 0.0),
        ('BotonLateralTrasero', 56.6, 74.6, 0.0, 2.6),
    ]
    capa_mas = capa_desplazada(cuerpo, 0.75, 'CapaMas')
    capa10 = capa_desplazada(cuerpo, -1.0, 'Capa10')
    botones = []
    for nombre, z0, z1, ia, ib in laterales:
        b = copia(capa_mas, nombre)
        booleana(b, prisma(nombre + 'P', poligono_lateral(z0, z1, ia, ib, -0.35), 'x', 12, 45), 'INTERSECT')
        booleana(b, copia(capa10, 'c10'), 'DIFFERENCE')
        botones.append(b)
        # Rebaje en el flanco: 1 mm de profundidad, holgura de 0,35 mm.
        rebaje = prisma(nombre + 'R', poligono_lateral(z0, z1, ia, ib, 0.35), 'x', 12, 45)
        booleana(rebaje, copia(capa10, 'c10b'), 'DIFFERENCE')
        booleana(inf, rebaje, 'DIFFERENCE')
    borrar(capa_mas, capa10)

    # --- Puerto USB-C en la nariz, bajo la tira
    puerto = prisma('PuertoHueco', rect_redondeado(0, 4.6, 8.6, 3.0, 1.4), 'z', -3, 7)
    booleana(inf, puerto, 'DIFFERENCE')

    # --- Ventana del sensor
    sensor_z = 44.0
    ventana = prisma('Ventana', rect_redondeado(0, sensor_z, 7.0, 7.0, 3.49, 12), 'h', -3, 3.0)
    booleana(inf, ventana, 'DIFFERENCE')
    lente = prisma('Lente', rect_redondeado(0, sensor_z, 6.6, 6.6, 3.29, 12), 'h', 1.0, 1.5)

    # --- Patines (PTFE negro) y etiqueta
    def huella(z0, z1, inset):
        pts = []
        pasos = 28
        for i in range(pasos + 1):
            z = z0 + (z1 - z0) * i / pasos
            pts.append((W(z) - min(6.0, 0.4 * W(z), 1.2 * (min(H0(z), HB(z) + 0.55 * (H(z) - HB(z))) - HB(z))) - inset, z))
        for i in range(pasos + 1):
            z = z1 - (z1 - z0) * i / pasos
            pts.append((-(W(z) - min(6.0, 0.4 * W(z), 1.2 * (min(H0(z), HB(z) + 0.55 * (H(z) - HB(z))) - HB(z))) - inset), z))
        return chaikin(pts, 3)

    patin_del = prisma('PatinDelantero', huella(10.5, 31.0, 2.2), 'h', -0.6, 0.15)
    patin_tra = prisma('PatinTrasero', huella(88.0, 110.5, 2.2), 'h', -0.6, 0.15)
    etiqueta = prisma('Etiqueta', rect_redondeado(0.0, 69.0, 28.0, 34.0, 1.5, 4), 'h', -0.12, 0.2)

    # --- Logotipo: "V" que acompaña la superficie (sobre la cubierta, a 86 mm)
    logo_z = 86.0
    v_poli = [(-9.0, logo_z - 6.0), (-6.8, logo_z - 6.0), (0, logo_z + 4.6), (6.8, logo_z - 6.0),
              (9.0, logo_z - 6.0), (1.3, logo_z + 6.0), (-1.3, logo_z + 6.0)]
    logo = copia(cuerpo, 'Logo')
    desplazar(logo, 0.06)
    booleana(logo, prisma('LogoP', v_poli, 'h', 10, 60), 'INTERSECT')
    booleana(logo, copia(capa05, 'c05'), 'DIFFERENCE')
    # Hueco en la cubierta para que el logo quede embutido.
    hueco_logo = prisma('LogoH', v_poli, 'h', 10, 60)
    booleana(hueco_logo, copia(capa05, 'c05b'), 'DIFFERENCE')
    booleana(sup, hueco_logo, 'DIFFERENCE')

    borrar(capa05, capa22, capa38)

    # --- Rueda: llanta con tacos de goma y buje
    rueda = construir_rueda()

    # Separa la cara interna de las carcasas para darle su propio material.
    interior_sup = separar_interior(sup, cuerpo, 'CarcasaSuperiorInterior')
    interior_inf = separar_interior(inf, cuerpo, 'CarcasaInferiorInterior')

    piezas = [sup, interior_sup, inf, interior_inf, tira, bandeja, dpi, logo,
              patin_del, patin_tra, etiqueta, lente, rueda] + botones
    if SALIDA.endswith('.blend'):
        preparar_blend(piezas, cuerpo)
        return
    acabar(piezas, cuerpo)
    if RENDERS:
        os.makedirs(RENDERS, exist_ok=True)
        renderizar(piezas, RENDERS)
    exportar(piezas)


def construir_rueda():
    """Rueda en coordenadas locales (eje = X, centro en el origen)."""
    segs = 96
    tacos = 24
    perfil = [  # (x, r)
        (-RUEDA_ANCHO / 2, RUEDA_R - 1.8), (-RUEDA_ANCHO / 2 + 0.3, RUEDA_R - 0.6),
        (-RUEDA_ANCHO / 2 + 1.0, RUEDA_R), (RUEDA_ANCHO / 2 - 1.0, RUEDA_R),
        (RUEDA_ANCHO / 2 - 0.3, RUEDA_R - 0.6), (RUEDA_ANCHO / 2, RUEDA_R - 1.8),
        (RUEDA_ANCHO / 2 - 0.4, 2.0), (-RUEDA_ANCHO / 2 + 0.4, 2.0),
    ]
    verts, caras = [], []
    k = len(perfil)
    for i in range(segs):
        a = 2 * math.pi * i / segs
        for x, r in perfil:
            verts.append(Vector((x, r * math.cos(a), r * math.sin(a))))
    for i in range(segs):
        for j in range(k):
            a = i * k + j
            b = i * k + (j + 1) % k
            c = ((i + 1) % segs) * k + j
            d = ((i + 1) % segs) * k + (j + 1) % k
            caras.append([a, b, d, c])
    ob = malla('Rueda', verts, caras)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(ob.data)
    bm.free()
    remallar(ob, 0.1)
    # Surcos transversales entre los tacos de goma.
    for i in range(tacos):
        a = 2 * math.pi * (i + 0.5) / tacos
        ca, sa = math.cos(a), math.sin(a)
        vs = []
        for x in (-RUEDA_ANCHO, RUEDA_ANCHO):
            for y in (-0.5, 0.5):
                for z in (RUEDA_R - 0.85, RUEDA_R + 2.0):
                    vs.append(Vector((x, y * ca - z * sa, y * sa + z * ca)))
        cs = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]]
        corte = malla('Surco%d' % i, vs, cs)
        bm = bmesh.new()
        bm.from_mesh(corte.data)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        bm.to_mesh(corte.data)
        bm.free()
        booleana(ob, corte, 'DIFFERENCE')
    # Surco central que parte cada taco en dos (la goma del Surge).
    anillo = []
    for i in range(64):
        a = 2 * math.pi * i / 64
        anillo.append((math.cos(a), math.sin(a)))
    vs = [Vector((x, (RUEDA_R + 2) * c, (RUEDA_R + 2) * s_)) for x in (-0.45, 0.45) for c, s_ in anillo]
    vs += [Vector((x, (RUEDA_R - 0.5) * c, (RUEDA_R - 0.5) * s_)) for x in (-0.45, 0.45) for c, s_ in anillo]
    cs = []
    for i in range(64):
        j = (i + 1) % 64
        cs += [[i, j, 64 + j, 64 + i], [128 + i, 192 + i, 192 + j, 128 + j], [i, 128 + i, 128 + j, j], [64 + i, 64 + j, 192 + j, 192 + i]]
    corte = malla('SurcoCentral', vs, cs)
    bm = bmesh.new()
    bm.from_mesh(corte.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(corte.data)
    bm.free()
    booleana(ob, corte, 'DIFFERENCE')
    return ob


def aplicar_transform(ob):
    ob.data.transform(ob.matrix_world)
    ob.matrix_world.identity()


def separar_interior(ob, cuerpo, nombre):
    """Mueve a otro objeto las caras que quedan > 0,9 mm dentro del cuerpo."""
    bm_c = bmesh.new()
    bm_c.from_mesh(cuerpo.data)
    arbol = BVHTree.FromBMesh(bm_c)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.faces.ensure_lookup_table()
    internas = []
    for f in bm.faces:
        c = f.calc_center_median()
        _, _, _, dist = arbol.find_nearest(c)
        if dist is not None and dist > 1.25 and f.normal.dot((c - arbol.find_nearest(c)[0]).normalized()) > 0.5:
            internas.append(f)
    bm_i = bm.copy()
    bm_i.faces.ensure_lookup_table()
    ids = {f.index for f in internas}
    bmesh.ops.delete(bm_i, geom=[f for f in bm_i.faces if f.index not in ids], context='FACES')
    bmesh.ops.delete(bm, geom=internas, context='FACES')
    bm.to_mesh(ob.data)
    me = bpy.data.meshes.new(nombre)
    bm_i.to_mesh(me)
    bm.free()
    bm_i.free()
    bm_c.free()
    nuevo = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(nuevo)
    return nuevo


# ------------------------------------------------------------ acabado/export
def suavizar(ob, angulo=38):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    lim = math.radians(angulo)
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        e.smooth = not (len(e.link_faces) == 2 and e.calc_face_angle(0) > lim)
    bm.to_mesh(ob.data)
    bm.free()


def diezmar(ob, caras_max):
    n = len(ob.data.polygons)
    if n <= caras_max:
        return
    m = ob.modifiers.new('dec', 'DECIMATE')
    m.decimate_type = 'COLLAPSE'
    m.ratio = caras_max / n
    m.use_collapse_triangulate = True
    aplicar(ob)


PRESUPUESTO = {  # caras antes de triangular (≈ la mitad de los triángulos)
    # A tamaño de héroe el ratón ocupa ~250 × 150 px: con más triángulos cada
    # uno cubre 1-2 píxeles y la GPU desperdicia el sombreado (medido: el
    # modelo de 74 k triángulos costaba 12 ms por frame en una iGPU).
    'CarcasaSuperior': 4200,
    'CarcasaSuperiorInterior': 1200,
    'CarcasaInferior': 2600,
    'CarcasaInferiorInterior': 1000,
    'TiraRGB': 1500,
    'Bandeja': 600,
    'BotonDPI': 400,
    'Logo': 400,
    'Rueda': 1800,
    'BotonLateralDelantero': 600,
    'BotonLateralTrasero': 600,
}

# Piezas con aristas vivas de molde: bisel de 0,25 mm que atrapa la luz.
BISELADAS = {'CarcasaSuperior', 'CarcasaInferior', 'BotonDPI', 'Bandeja',
             'BotonLateralDelantero', 'BotonLateralTrasero'}
# Piezas que reciben oclusión ambiental horneada (no la rueda, que gira, ni
# las emisivas).
CON_AO = BISELADAS | {'CarcasaSuperiorInterior', 'CarcasaInferiorInterior',
                      'PatinDelantero', 'PatinTrasero', 'Etiqueta'}


def biselar(ob, ancho=0.25):
    for p in ob.data.polygons:
        p.use_smooth = True
    m = ob.modifiers.new('bisel', 'BEVEL')
    m.width = ancho
    m.segments = 3
    m.limit_method = 'ANGLE'
    m.angle_limit = math.radians(60)
    m.harden_normals = True
    m.use_clamp_overlap = True
    aplicar(ob)


def hornear_ao(piezas):
    """Oclusión ambiental del ratón montado, horneada en color de vértice.

    Oscurece lo que en un ratón real recibe menos luz: la ranura y el pozo
    de la rueda, las juntas con la tira, los rebajes de los laterales y la
    base bajo el labio de los botones. Se suaviza (0,45 → 1) para que
    module la luz sin ensuciar el plástico."""
    escena = bpy.context.scene
    escena.render.engine = 'CYCLES'
    escena.cycles.device = 'CPU'
    escena.cycles.samples = 64
    if escena.world is None:
        escena.world = bpy.data.worlds.new('mundo')
    escena.world.light_settings.distance = 6.0  # mm
    material = bpy.data.materials.new('ao')
    for ob in piezas:
        if not ob.data.materials:
            ob.data.materials.append(material)
    for ob in piezas:
        if ob.name not in CON_AO:
            continue
        atributo = ob.data.color_attributes.new('AO', 'BYTE_COLOR', 'POINT')
        ob.data.color_attributes.active_color = atributo
        for o in bpy.context.view_layer.objects:
            o.select_set(o == ob)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
        for dato in atributo.data:
            ao = dato.color_srgb[0]
            v = 0.45 + 0.55 * ao
            dato.color_srgb = (v, v, v, 1.0)
        valores = [d.color_srgb[0] for d in atributo.data]
        print('AO', ob.name, round(min(valores), 2), round(sum(valores) / len(valores), 2))


def acabar(piezas, cuerpo):
    borrar(cuerpo)
    for ob in list(bpy.data.objects):
        if ob not in piezas:
            borrar(ob)
    for ob in piezas:
        diezmar(ob, PRESUPUESTO.get(ob.name, 600))
        if ob.name in BISELADAS:
            biselar(ob)
        else:
            suavizar(ob)
    # La rueda gira sobre su eje: su origen va en el centro.
    bpy.data.objects['Rueda'].location = P(0, RUEDA_Z, RUEDA_H)
    hornear_ao(piezas)


def preparar_blend(piezas, cuerpo):
    """Modelo a resolución completa, en metros, para el render fotorrealista
    (`modelado/render.py`): sin diezmar ni hornear AO (Cycles la calcula),
    con los biseles de molde aplicados sobre la malla densa."""
    borrar(cuerpo)
    for ob in list(bpy.data.objects):
        if ob not in piezas:
            borrar(ob)
    bpy.data.objects['Rueda'].location = P(0, RUEDA_Z, RUEDA_H)
    for ob in piezas:
        if ob.name in BISELADAS:
            biselar(ob, 0.2)
        else:
            suavizar(ob)
        ob.data.transform(Matrix.Scale(0.001, 4))
        ob.location = ob.location * 0.001
    bpy.ops.wm.save_as_mainfile(filepath=SALIDA)
    print('BLEND', SALIDA)


def exportar(piezas):
    # Escala de la escena horneada en los vértices: en three cada malla llega
    # ya en unidades de la escena y solo la rueda conserva su posición.
    for ob in piezas:
        ob.data.transform(Matrix.Scale(ESCALA, 4))
        ob.location = ob.location * ESCALA
        ob.select_set(True)
    resumen = {ob.name: len(ob.data.polygons) for ob in piezas}
    print('CARAS', resumen, 'TOTAL', sum(resumen.values()))
    bpy.ops.export_scene.gltf(
        filepath=SALIDA,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials='NONE',
        export_normals=True,
        export_vertex_color='ACTIVE',
        # Las UV triplanares se recalculan en el navegador (modeloRaton.ts):
        # el GLB pesa un 25 % menos.
        export_texcoords=False,
        export_tangents=False,
    )
    print('GLB', SALIDA, os.path.getsize(SALIDA))


def renderizar(piezas, carpeta):
    """Vistas de comprobación (ortográficas) contra las fotos de referencia."""
    escena = bpy.context.scene
    escena.render.engine = 'BLENDER_WORKBENCH'
    escena.display.shading.light = 'STUDIO'
    escena.display.shading.color_type = 'VERTEX'
    escena.display.shading.show_cavity = True
    escena.render.resolution_x = 1400
    escena.render.resolution_y = 900
    escena.render.film_transparent = False
    escena.world = bpy.data.worlds.new('w') if escena.world is None else escena.world
    colores = {
        'TiraRGB': (0.2, 0.9, 1.0, 1), 'Logo': (1.0, 0.2, 0.3, 1), 'BotonDPI': (0.02, 0.02, 0.02, 1),
        'Bandeja': (0.03, 0.03, 0.03, 1), 'Rueda': (0.12, 0.12, 0.12, 1),
        'CarcasaInferior': (0.16, 0.16, 0.17, 1), 'PatinDelantero': (0.05, 0.05, 0.05, 1),
        'PatinTrasero': (0.05, 0.05, 0.05, 1), 'Etiqueta': (0.6, 0.6, 0.6, 1),
    }
    for ob in piezas:
        ob.color = colores.get(ob.name, (0.28, 0.28, 0.3, 1))
    cam_data = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cam_data)
    escena.collection.objects.link(cam)
    escena.camera = cam
    centro = P(0, 60, 20)
    vistas = {
        'lateral_izq': (Vector((200, 0, 0)), 'ORTHO', 135),
        'cenital': (Vector((0, 0, 200)), 'ORTHO', 135),
        'frontal': (Vector((0, -200, 0)), 'ORTHO', 80),
        'trasera': (Vector((0, 200, 0)), 'ORTHO', 80),
        'base': (Vector((0, 0, -200)), 'ORTHO', 135),
        'tres_cuartos': (Vector((130, -150, 90)), 'PERSP', 0),
        'tres_cuartos_tras': (Vector((-120, 170, 110)), 'PERSP', 0),
    }
    for nombre, (dirv, tipo, escala_orto) in vistas.items():
        cam.location = centro + dirv
        d = (centro - cam.location).normalized()
        if nombre == 'cenital':
            cam.rotation_euler = (0, 0, math.pi)
        elif nombre == 'base':
            cam.rotation_euler = (math.pi, 0, 0)
        else:
            cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        cam_data.type = tipo
        cam_data.ortho_scale = escala_orto
        cam_data.lens = 50
        cam_data.clip_end = 2000
        escena.render.filepath = os.path.join(carpeta, nombre + '.png')
        bpy.ops.render.render(write_still=True)
    borrar(cam)


main()
