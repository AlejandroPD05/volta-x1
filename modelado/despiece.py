"""
Despiece fotorrealista para la web: la explosión del ratón renderizada en
Cycles, que la web reproduce con el scroll (`src/componentes/DespieceFoto.tsx`).

    blender --background modelado/raton.blend --python modelado/despiece.py -- <carpeta> [--frames 60] [--ancho 1600] [--muestras 64] [--base|--luz] [--fotograma N]

Las piezas internas (PCB, batería, switches, encoder...) solo existen en la
escena de la web, así que se exportan desde ella a `modelado/despiece/web.glb`
(las seis capas del ratón con el despiece a cero; ver README). Aquí:

  1. se importan y se escalan a metros (1 u de la web = 1 / ESCALA mm),
  2. las piezas que también existen en el modelo denso de `raton.blend`
     (carcasas, botones, rueda, tira, patines...) sustituyen a las de la web,
  3. cada capa se anima con los desplazamientos y retardos de
     `src/escena/partes/*.tsx` (`Parte`); la cámara arranca en el mismo plano
     que el fotograma 0 del giro del héroe (`giro.py`) y se aleja orbitando,
  4. se renderiza en dos pasadas como el giro: base/ con la luz de estudio y
     los LED de acento apagados, luz/ solo esos LED en blanco; la web suma
     luz × acento,
  5. se escribe `hotspots.json`: la posición en pantalla (0..1) de cada
     hotspot en cada fotograma, para colocar los marcadores sobre la foto.

Con `--fotograma N` solo renderiza ese fotograma (prueba) en <carpeta>/prueba.
"""

import json
import math
import os
import sys

import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

RAIZ = os.path.dirname(os.path.abspath(__file__))
_args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SALIDA = os.path.abspath(_args[0]) if _args else os.path.join(RAIZ, 'despiece', 'render')
FRAMES = int(_args[_args.index('--frames') + 1]) if '--frames' in _args else 60
ANCHO = int(_args[_args.index('--ancho') + 1]) if '--ancho' in _args else 1600
MUESTRAS = int(_args[_args.index('--muestras') + 1]) if '--muestras' in _args else 64
PASES = [p for p in ('base', 'luz') if '--' + p in _args] or ['base', 'luz']
FOTOGRAMA = int(_args[_args.index('--fotograma') + 1]) if '--fotograma' in _args else None

ESCALA_WEB = 1.164 / 120.0          # unidades de la web por mm (surge.py)
U = 0.001 / ESCALA_WEB              # metros por unidad de la web

# Capas exportadas desde la web, en el orden en que R3F monta `Raton.tsx`,
# con su desplazamiento final (u), retardo y giro final (rad) de `Parte`.
CAPAS = {
    'capa0': ('CarcasaSuperior', (0, 1.95, -0.04), 0.0, (0, 0, 0.05)),
    'capa1': ('Botones', (0, 1.22, 0.06), 0.2, (0, 0, 0)),
    'capa2': ('RuedaScroll', (0, 1.32, 0.02), 0.1, (0, 0, 0)),
    'capa3': ('Pcb', (0, 0.88, 0), 0.32, (0, 0, 0)),
    'capa4': ('Bateria', (0, 0.5, -0.06), 0.44, (0, 0, 0)),
    'capa5': ('CarcasaInferior', (0, 0, 0), 0.0, (0, 0, 0)),
}

# Hotspots (src/datos/especificaciones.ts), en coordenadas del grupo del ratón.
HOTSPOTS = {
    'carcasa': (0.42, 2.28, -0.3),
    'botones': (0.38, 1.5, 0.46),
    'rueda': (-0.4, 1.66, 0.42),
    'pcb': (-0.42, 1.1, 0.34),
    'bateria': (0.38, 0.65, -0.24),
    'base': (-0.02, 0.13, 0.05),
}

ESTUDIO = ('Principal', 'Recorte', 'Relleno')
FIJOS = set(ESTUDIO) | {'Alfombrilla', 'Camara', 'Foco', 'Giro', 'Raton'}
# Emisivos de acento del modelo denso: (material, fuerza en la pasada luz).
ACENTO_DENSO = {'TiraRGB': 1.5, 'Logo': 1.1}

# Cámara: del plano del giro del héroe (fotograma 0) al despiece entero.
CAM_INICIO = dict(az=-45.0, el=19.2, dist=0.404, mira=0.012)
CAM_FIN = dict(az=-22.0, el=14.0, dist=1.08, mira=0.12)

escena = bpy.context.scene


# --------------------------------------------------------------------------
#  Utilidades
# --------------------------------------------------------------------------
def acotar(v, a, b):
    return max(a, min(b, v))


def escalon(t):
    t = acotar(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def progreso_capa(e, retardo):
    return escalon((e - retardo) / (1 - retardo))


def caja_mundo(ob):
    esquinas = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    mn = Vector([min(c[i] for c in esquinas) for i in range(3)])
    mx = Vector([max(c[i] for c in esquinas) for i in range(3)])
    return mn, mx


def web_local(v):
    """Vector de la web (Y arriba) a los ejes de Blender (Z arriba), en u."""
    x, y, z = v
    return Vector((x, -z, y))


# --------------------------------------------------------------------------
#  Montaje
# --------------------------------------------------------------------------
def importar_web():
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(RAIZ, 'despiece', 'web.glb'))
    nuevos = [o for o in bpy.data.objects if o not in antes]
    raton = bpy.data.objects.new('Raton', None)
    escena.collection.objects.link(raton)
    for o in nuevos:
        if o.parent is None:
            o.parent = raton
    raton.scale = (U, U, U)
    bpy.context.view_layer.update()
    capas = {o.name.split('.')[0]: o for o in nuevos if o.type == 'EMPTY' and o.name.split('.')[0] in CAPAS}
    assert len(capas) == 6, capas
    return raton, capas


def sustituir_por_densas(capas):
    """Cada pieza densa ocupa el sitio de la malla web cuya caja coincide."""
    web = [(n, o) for n, c in capas.items() for o in c.children_recursive if o.type == 'MESH']
    cajas = {o: caja_mundo(o) for _, o in web}
    densas = [o for o in bpy.data.objects if o.type == 'MESH' and o.name not in FIJOS
              and o.parent is None and o.name != 'TiraLuz']
    quitar = set()
    capa_de = {}
    for d in densas:
        dmn, dmx = caja_mundo(d)
        err, nombre, w = min(((cajas[w][0] - dmn).length + (cajas[w][1] - dmx).length, n, w) for n, w in web)
        assert err < 0.002, (d.name, err)
        quitar.add(w)
        capa_de[d.name] = capas[nombre]
    capa_de['TiraLuz'] = capa_de['TiraRGB']
    for nombre, capa in capa_de.items():
        d = bpy.data.objects[nombre]
        mundo = d.matrix_world.copy()
        d.parent = capa
        d.matrix_world = mundo
    # Anillos de la onda del suelo (efecto de la web, no una pieza).
    for o in capas['capa5'].children_recursive:
        if o.type == 'MESH' and o not in quitar:
            mn, mx = caja_mundo(o)
            if mx.x - mn.x > 0.15:
                quitar.add(o)
    for o in quitar:
        bpy.data.objects.remove(o, do_unlink=True)
    print('SUSTITUIDAS', len(capa_de), 'QUITADAS', len(quitar))


def clasificar_emisivos(capas):
    """Materiales emisivos de las piezas web: los de acento (cian) pasan a la
    pasada de luz; los demás (LED rojos de estado) se quedan en la base."""
    acento, otros = {}, {}
    vistos = set()
    for c in capas.values():
        for o in c.children_recursive:
            if o.type != 'MESH':
                continue
            for m in o.data.materials:
                if not m or m.name in vistos or not m.use_nodes:
                    continue
                vistos.add(m.name)
                b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
                if b is None:
                    continue
                col = b.inputs['Emission Color'].default_value
                fuerza = b.inputs['Emission Strength'].default_value
                if fuerza <= 0 or max(col[0], col[1], col[2]) < 0.01:
                    continue
                es_acento = col[2] > 0.4 and col[1] > 0.3 and col[0] < 0.15
                (acento if es_acento else otros)[m.name] = (tuple(col), fuerza)
    print('EMISIVOS acento', acento)
    print('EMISIVOS otros', otros)
    return acento, otros


def alfombrilla_desvanecida():
    """La alfombrilla se funde en transparencia lejos del ratón: el fondo del
    render es el de la página (la pasada base sale con canal alfa), sin
    horizonte ni bordes cuando la cámara se aleja."""
    ob = bpy.data.objects['Alfombrilla']
    a = ob.data.materials[0].node_tree
    salida = next(n for n in a.nodes if n.type == 'OUTPUT_MATERIAL')
    bsdf = salida.inputs['Surface'].links[0].from_node
    geo = a.nodes.new('ShaderNodeNewGeometry')
    xy = a.nodes.new('ShaderNodeVectorMath')
    xy.operation = 'MULTIPLY'
    xy.inputs[1].default_value = (1, 1, 0)
    largo = a.nodes.new('ShaderNodeVectorMath')
    largo.operation = 'LENGTH'
    rango = a.nodes.new('ShaderNodeMapRange')
    rango.interpolation_type = 'SMOOTHERSTEP'
    rango.inputs['From Min'].default_value = 0.12
    rango.inputs['From Max'].default_value = 0.42
    hueco = a.nodes.new('ShaderNodeHoldout')
    mezcla = a.nodes.new('ShaderNodeMixShader')
    a.links.new(geo.outputs['Position'], xy.inputs[0])
    a.links.new(xy.outputs['Vector'], largo.inputs[0])
    a.links.new(largo.outputs['Value'], rango.inputs['Value'])
    a.links.new(rango.outputs['Result'], mezcla.inputs['Fac'])
    a.links.new(bsdf.outputs[0], mezcla.inputs[1])
    a.links.new(hueco.outputs[0], mezcla.inputs[2])
    a.links.new(mezcla.outputs[0], salida.inputs['Surface'])


# --------------------------------------------------------------------------
#  Animación
# --------------------------------------------------------------------------
def plano_camara(e):
    """Posición de cámara y punto de mira para una explosión e (0..1)."""
    t = escalon(e)
    az = math.radians(CAM_INICIO['az'] + (CAM_FIN['az'] - CAM_INICIO['az']) * t)
    el = math.radians(CAM_INICIO['el'] + (CAM_FIN['el'] - CAM_INICIO['el']) * t)
    # Travelling de alejamiento en escala logarítmica: velocidad aparente uniforme.
    dist = CAM_INICIO['dist'] * (CAM_FIN['dist'] / CAM_INICIO['dist']) ** t
    mira = Vector((0, 0, CAM_INICIO['mira'] + (CAM_FIN['mira'] - CAM_INICIO['mira']) * t))
    pos = mira + Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el))) * dist
    return pos, mira


def animar(capas):
    escena.frame_start = 1
    escena.frame_end = FRAMES
    cam = bpy.data.objects['Camara']
    foco = bpy.data.objects['Foco']
    cam.data.lens = 85
    cam.data.sensor_width = 36
    cam.data.sensor_fit = 'AUTO'
    cam.data.clip_end = 20
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_fstop = 11
    cam.data.dof.focus_object = foco
    escena.camera = cam
    for f in range(1, FRAMES + 1):
        e = (f - 1) / (FRAMES - 1)
        for clave, capa in capas.items():
            _, desp, retardo, giro = CAPAS[clave]
            p = progreso_capa(e, retardo)
            capa.location = web_local(desp) * p
            # Giro de la web en (x, y, z) → ejes de Blender (x, -z, y).
            capa.rotation_euler = (giro[0] * p, -giro[2] * p, giro[1] * p)
            capa.keyframe_insert('location', frame=f)
            capa.keyframe_insert('rotation_euler', frame=f)
        pos, mira = plano_camara(e)
        cam.location = pos
        cam.rotation_euler = (mira - pos).to_track_quat('-Z', 'Y').to_euler()
        foco.location = mira
        cam.keyframe_insert('location', frame=f)
        cam.keyframe_insert('rotation_euler', frame=f)
        foco.keyframe_insert('location', frame=f)


def hotspots(raton):
    """Posición en pantalla (0..1, origen arriba a la izquierda) por fotograma."""
    cam = bpy.data.objects['Camara']
    datos = {k: [] for k in HOTSPOTS}
    for f in range(1, FRAMES + 1):
        escena.frame_set(f)
        for k, v in HOTSPOTS.items():
            p = world_to_camera_view(escena, cam, raton.matrix_world @ web_local(v))
            datos[k].append([round(p.x, 4), round(1 - p.y, 4)])
    os.makedirs(SALIDA, exist_ok=True)
    with open(os.path.join(SALIDA, 'hotspots.json'), 'w', encoding='utf-8') as fichero:
        json.dump({'fotogramas': FRAMES, 'aspecto': 16 / 9, 'hotspots': datos}, fichero)


# --------------------------------------------------------------------------
#  Render
# --------------------------------------------------------------------------
def gpu():
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for tipo in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI'):
        try:
            prefs.compute_device_type = tipo
            prefs.get_devices()
            if any(d.type != 'CPU' for d in prefs.devices):
                for d in prefs.devices:
                    d.use = d.type != 'CPU'
                escena.cycles.device = 'GPU'
                return tipo
        except TypeError:
            continue
    return 'CPU'


def ajustes():
    escena.render.engine = 'CYCLES'
    print('DISPOSITIVO', gpu())
    escena.render.resolution_x = ANCHO
    escena.render.resolution_y = round(ANCHO * 9 / 16)
    escena.render.resolution_percentage = 100
    escena.cycles.samples = MUESTRAS
    escena.cycles.use_denoising = True
    escena.render.use_persistent_data = True
    escena.render.image_settings.file_format = 'WEBP'
    escena.render.image_settings.quality = 88


def principled(m):
    return next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')


def emisiones(pase, acento, otros):
    luz = pase == 'luz'
    for nombre, fuerza in ACENTO_DENSO.items():
        b = principled(bpy.data.materials[nombre])
        b.inputs['Emission Color'].default_value = (1, 1, 1, 1)
        b.inputs['Emission Strength'].default_value = fuerza if luz else 0.0
    em = bpy.data.materials['TiraLuzSolo'].node_tree.nodes['Emission']
    em.inputs['Color'].default_value = (1, 1, 1, 1)
    em.inputs['Strength'].default_value = 22.0 if luz else 0.0
    for nombre, (_, fuerza) in acento.items():
        b = principled(bpy.data.materials[nombre])
        b.inputs['Emission Color'].default_value = (1, 1, 1, 1)
        b.inputs['Emission Strength'].default_value = fuerza if luz else 0.0
    for nombre, (_, fuerza) in otros.items():
        principled(bpy.data.materials[nombre]).inputs['Emission Strength'].default_value = 0.0 if luz else fuerza


def fondos():
    hdri, oscuros = None, []
    for n in escena.world.node_tree.nodes:
        if n.type == 'BACKGROUND':
            if n.inputs['Color'].is_linked:
                hdri = n
            else:
                oscuros.append(n)
    return hdri, oscuros


def pase(nombre, acento, otros):
    hdri, oscuros = fondos()
    glare = escena.compositing_node_group.nodes.get('Glare') if escena.compositing_node_group else None
    luz = nombre == 'luz'
    for n in ESTUDIO:
        bpy.data.objects[n].hide_render = luz
    hdri.inputs['Strength'].default_value = 0.0 if luz else 0.35
    for n in oscuros:
        n.inputs['Strength'].default_value = 0.0 if luz else 1.0
    if glare:
        glare.mute = not luz
    # Base con alfa (se dibuja sobre el fondo de la página); la luz, opaca
    # sobre negro, porque la web la suma y el resplandor cae fuera del ratón.
    escena.render.film_transparent = not luz
    escena.render.image_settings.color_mode = 'RGB' if luz else 'RGBA'
    emisiones(nombre, acento, otros)
    if FOTOGRAMA is not None:
        escena.frame_set(FOTOGRAMA)
        escena.render.filepath = os.path.join(SALIDA, 'prueba', f'{nombre}_{FOTOGRAMA:04d}')
        bpy.ops.render.render(write_still=True)
    else:
        escena.render.filepath = os.path.join(SALIDA, nombre, '')
        bpy.ops.render.render(animation=True)


def main():
    raton, capas = importar_web()
    sustituir_por_densas(capas)
    acento, otros = clasificar_emisivos(capas)
    alfombrilla_desvanecida()
    animar(capas)
    hotspots(raton)
    ajustes()
    for p in PASES:
        pase(p, acento, otros)
        print('PASE', p, 'listo')


main()
