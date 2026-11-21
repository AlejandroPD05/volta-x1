"""
Escena de producto fotorrealista para el ratón (Cycles).

Se ejecuta sobre el .blend denso que genera `surge.py`:
    blender --background --factory-startup --python modelado/surge.py -- modelado/raton.blend
    blender --background modelado/raton.blend --python modelado/render.py -- <carpeta_salida> [plano ...] [--muestras N] [--ancho W]

o desde el servidor MCP de Blender (Blender abierto con el add-on MCP y
`--online-mode`) con `exec(open(...).read())`, fijando `RENDER_ARGS` antes. Recursos de Poly Haven (CC0) en `modelado/polyhaven/`:
HDRI `studio_small_09` y la tela `bi_stretch` de la alfombrilla.

Planos: heroe (3/4 delantero bajo), lateral, trasera (logo y tira),
rueda (macro del pozo y el DPI).
"""

import math
import os
import sys

import bpy
from mathutils import Vector

RAIZ = os.path.dirname(os.path.abspath(bpy.data.filepath))
PH = os.path.join(RAIZ, 'polyhaven')

_args = globals().get('RENDER_ARGS')
if _args is None:
    _args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SALIDA = os.path.abspath(_args[0]) if _args else os.path.join(RAIZ, 'renders')
PLANOS = [a for a in _args[1:] if not a.startswith('--') and not a.isdigit()] or ['heroe']
MUESTRAS = int(_args[_args.index('--muestras') + 1]) if '--muestras' in _args else 384
ANCHO = int(_args[_args.index('--ancho') + 1]) if '--ancho' in _args else 1920

CIAN = (0.0, 0.62, 1.0)


# ------------------------------------------------------------------ helpers
def nodo(arbol, tipo, x=0, y=0, **props):
    n = arbol.nodes.new(tipo)
    n.location = (x, y)
    for k, v in props.items():
        setattr(n, k, v)
    return n


def principled(nombre, color, rugosidad, **entradas):
    m = bpy.data.materials.get(nombre) or bpy.data.materials.new(nombre)
    m.use_nodes = True
    arbol = m.node_tree
    arbol.nodes.clear()
    salida = nodo(arbol, 'ShaderNodeOutputMaterial', 600, 0)
    bsdf = nodo(arbol, 'ShaderNodeBsdfPrincipled', 200, 0)
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rugosidad
    for k, v in entradas.items():
        bsdf.inputs[k].default_value = v
    arbol.links.new(bsdf.outputs[0], salida.inputs['Surface'])
    return m, arbol, bsdf


def grano(arbol, bsdf, escala, fuerza, rug_var=0.0, rug_base=None):
    """Micro-relieve procedural (grano de molde) y variación de rugosidad
    a gran escala (zonas pulidas por el uso)."""
    coord = nodo(arbol, 'ShaderNodeTexCoord', -900, 0)
    ruido = nodo(arbol, 'ShaderNodeTexNoise', -650, -200)
    ruido.inputs['Scale'].default_value = escala
    ruido.inputs['Detail'].default_value = 6
    ruido.inputs['Roughness'].default_value = 0.6
    arbol.links.new(coord.outputs['Object'], ruido.inputs['Vector'])
    bump = nodo(arbol, 'ShaderNodeBump', -250, -250)
    bump.inputs['Strength'].default_value = fuerza
    bump.inputs['Distance'].default_value = 0.00004
    arbol.links.new(ruido.outputs['Fac'], bump.inputs['Height'])
    arbol.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    if rug_var:
        manchas = nodo(arbol, 'ShaderNodeTexNoise', -650, 200)
        manchas.inputs['Scale'].default_value = 18
        manchas.inputs['Detail'].default_value = 2
        arbol.links.new(coord.outputs['Object'], manchas.inputs['Vector'])
        rampa = nodo(arbol, 'ShaderNodeMapRange', -300, 200)
        rampa.inputs['To Min'].default_value = rug_base - rug_var
        rampa.inputs['To Max'].default_value = rug_base + rug_var
        arbol.links.new(manchas.outputs['Fac'], rampa.inputs['Value'])
        arbol.links.new(rampa.outputs['Result'], bsdf.inputs['Roughness'])


def emisivo(nombre, color, fuerza, difusor=0.9):
    m, arbol, bsdf = principled(nombre, (difusor,) * 3, 0.35)
    bsdf.inputs['Emission Color'].default_value = (*color, 1)
    bsdf.inputs['Emission Strength'].default_value = fuerza
    return m


def asignar(nombre_obj, material):
    ob = bpy.data.objects.get(nombre_obj)
    if not ob:
        return
    ob.data.materials.clear()
    ob.data.materials.append(material)
    for p in ob.data.polygons:
        p.use_smooth = True


# ---------------------------------------------------------------- materiales
def materiales():
    # Soft-touch negro: rugosidad media con zonas algo más pulidas, un velo de
    # sheen (el tacto gomoso) y grano fino de molde.
    m, a, b = principled('SoftTouch', (0.011, 0.012, 0.014), 0.46,
                         **{'Sheen Weight': 0.25, 'Sheen Roughness': 0.45,
                            'Specular IOR Level': 0.45})
    grano(a, b, escala=2600, fuerza=0.12, rug_var=0.06, rug_base=0.46)
    for n in ('CarcasaSuperior',):
        asignar(n, m)

    m, a, b = principled('PlasticoInterior', (0.02, 0.021, 0.024), 0.7)
    asignar('CarcasaSuperiorInterior', m)
    asignar('CarcasaInferiorInterior', m)

    # Flancos: plástico granulado sin goma, más seco.
    m, a, b = principled('Granulado', (0.013, 0.014, 0.016), 0.62,
                         **{'Specular IOR Level': 0.4})
    grano(a, b, escala=900, fuerza=0.35, rug_var=0.04, rug_base=0.62)
    asignar('CarcasaInferior', m)

    m, a, b = principled('LateralSatinado', (0.012, 0.013, 0.015), 0.38)
    grano(a, b, escala=1800, fuerza=0.1)
    asignar('BotonLateralDelantero', m)
    asignar('BotonLateralTrasero', m)

    # Piano black del pozo y del DPI: barniz de alto brillo.
    m, a, b = principled('PianoBlack', (0.006, 0.006, 0.007), 0.2,
                         **{'Coat Weight': 1.0, 'Coat Roughness': 0.03})
    asignar('Bandeja', m)
    asignar('BotonDPI', m)

    m, a, b = principled('Goma', (0.018, 0.018, 0.019), 0.78,
                         **{'Specular IOR Level': 0.3})
    grano(a, b, escala=1200, fuerza=0.4)
    asignar('Rueda', m)

    m, a, b = principled('PTFE', (0.03, 0.03, 0.032), 0.3)
    asignar('PatinDelantero', m)
    asignar('PatinTrasero', m)
    m, a, b = principled('Etiqueta', (0.05, 0.05, 0.055), 0.5)
    asignar('Etiqueta', m)
    m, a, b = principled('Lente', (0.01, 0.01, 0.01), 0.02,
                         **{'Transmission Weight': 0.6})
    asignar('Lente', m)

    # Tira y logotipo: difusor lechoso con los LEDs detrás.
    # Con más intensidad AgX lo lava a blanco: así conserva el cian.
    asignar('TiraRGB', emisivo('TiraRGB', CIAN, 1.5, difusor=0.2))
    asignar('Logo', emisivo('Logo', CIAN, 1.1, difusor=0.2))


# ---------------------------------------------------------- escena y luces
def mundo():
    w = bpy.data.worlds.get('Estudio') or bpy.data.worlds.new('Estudio')
    bpy.context.scene.world = w
    w.use_nodes = True
    a = w.node_tree
    a.nodes.clear()
    salida = nodo(a, 'ShaderNodeOutputWorld', 600, 0)
    coord = nodo(a, 'ShaderNodeTexCoord', -900, 0)
    mapeo = nodo(a, 'ShaderNodeMapping', -700, 0)
    mapeo.inputs['Rotation'].default_value = (0, 0, math.radians(110))
    hdri = nodo(a, 'ShaderNodeTexEnvironment', -450, 0)
    hdri.image = bpy.data.images.load(os.path.join(PH, 'studio_small_09_2k.hdr'), check_existing=True)
    fondo = nodo(a, 'ShaderNodeBackground', -150, 100)
    fondo.inputs['Strength'].default_value = 0.35
    # La cámara ve un estudio oscuro; el HDRI solo ilumina y se refleja.
    oscuro = nodo(a, 'ShaderNodeBackground', -150, -100)
    oscuro.inputs['Color'].default_value = (0.004, 0.0045, 0.006, 1)
    camino = nodo(a, 'ShaderNodeLightPath', -150, 300)
    mezcla = nodo(a, 'ShaderNodeMixShader', 250, 0)
    a.links.new(coord.outputs['Generated'], mapeo.inputs['Vector'])
    a.links.new(mapeo.outputs['Vector'], hdri.inputs['Vector'])
    a.links.new(hdri.outputs['Color'], fondo.inputs['Color'])
    a.links.new(camino.outputs['Is Camera Ray'], mezcla.inputs['Fac'])
    a.links.new(fondo.outputs[0], mezcla.inputs[1])
    a.links.new(oscuro.outputs[0], mezcla.inputs[2])
    a.links.new(mezcla.outputs[0], salida.inputs['Surface'])


def alfombrilla():
    ob = bpy.data.objects.get('Alfombrilla')
    if ob is None:
        bpy.ops.mesh.primitive_plane_add(size=1.6, location=(0, 0, -0.0006))
        ob = bpy.context.active_object
        ob.name = 'Alfombrilla'
    m, a, b = principled('TelaAlfombrilla', (0.02, 0.02, 0.022), 0.9,
                         **{'Sheen Weight': 0.04, 'Sheen Roughness': 0.5,
                            'Specular IOR Level': 0.08})
    coord = nodo(a, 'ShaderNodeTexCoord', -1100, 0)
    mapeo = nodo(a, 'ShaderNodeMapping', -900, 0)
    # Una tesela = 264 mm (cotas de Poly Haven); el plano mide 1,6 m.
    mapeo.inputs['Scale'].default_value = (1.6 / 0.264,) * 3
    a.links.new(coord.outputs['UV'], mapeo.inputs['Vector'])

    def imagen(fichero, x, y, color=True):
        t = nodo(a, 'ShaderNodeTexImage', x, y)
        t.image = bpy.data.images.load(os.path.join(PH, fichero), check_existing=True)
        if not color:
            t.image.colorspace_settings.name = 'Non-Color'
        a.links.new(mapeo.outputs['Vector'], t.inputs['Vector'])
        return t

    dif = imagen('bi_stretch_diff_2k.jpg', -650, 250)
    # Tela de alfombrilla gaming: negra y neutra. La textura de Poly Haven
    # es beige: se pasa a luminancia y solo aporta el dibujo del tejido.
    gris = nodo(a, 'ShaderNodeRGBToBW', -400, 250)
    a.links.new(dif.outputs['Color'], gris.inputs['Color'])
    tono = nodo(a, 'ShaderNodeMapRange', -200, 250)
    tono.inputs['To Min'].default_value = 0.006
    tono.inputs['To Max'].default_value = 0.03
    a.links.new(gris.outputs['Val'], tono.inputs['Value'])
    a.links.new(tono.outputs['Result'], b.inputs['Base Color'])
    rug = imagen('bi_stretch_rough_2k.jpg', -650, 0, color=False)
    a.links.new(rug.outputs['Color'], b.inputs['Roughness'])
    nor = imagen('bi_stretch_nor_gl_2k.jpg', -650, -250, color=False)
    mapa = nodo(a, 'ShaderNodeNormalMap', -350, -250)
    mapa.inputs['Strength'].default_value = 0.8
    a.links.new(nor.outputs['Color'], mapa.inputs['Color'])
    a.links.new(mapa.outputs['Normal'], b.inputs['Normal'])
    ob.data.materials.clear()
    ob.data.materials.append(m)


def luz_area(nombre, loc, objetivo, tam, potencia, color=(1, 1, 1), forma='RECTANGLE', tam_y=None):
    l = bpy.data.lights.get(nombre) or bpy.data.lights.new(nombre, 'AREA')
    l.shape = forma
    l.size = tam
    l.size_y = tam_y or tam
    l.energy = potencia
    l.color = color
    ob = bpy.data.objects.get(nombre) or bpy.data.objects.new(nombre, l)
    if ob.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(ob)
    ob.location = Vector(loc)
    ob.rotation_euler = (Vector(objetivo) - ob.location).to_track_quat('-Z', 'Y').to_euler()
    return ob


def luces():
    # Softbox principal arriba-delante-izquierda y recorte trasero que dibuja
    # el lomo; relleno muy suave por la derecha. El HDRI hace el resto.
    luz_area('Principal', (0.22, -0.28, 0.42), (0, -0.01, 0.01), 0.35, 2.2)
    luz_area('Recorte', (-0.18, 0.34, 0.16), (0, 0.0, 0.03), 0.5, 1.6, tam_y=0.06)
    luz_area('Relleno', (-0.35, -0.12, 0.12), (0, 0, 0.02), 0.4, 0.3, color=(0.85, 0.9, 1.0))


def tira_luz():
    """Derrame de la tira: copia de su malla con una emisión fuerte que la
    cámara y los reflejos no ven. Así el cian baña flancos y alfombrilla sin
    lavar a blanco la tira visible (AgX desatura las emisiones intensas)."""
    tira = bpy.data.objects['TiraRGB']
    luz = bpy.data.objects.get('TiraLuz')
    if luz is None:
        luz = tira.copy()
        luz.name = 'TiraLuz'
        bpy.context.scene.collection.objects.link(luz)
    luz.data = tira.data
    m = bpy.data.materials.get('TiraLuzSolo') or bpy.data.materials.new('TiraLuzSolo')
    m.use_nodes = True
    arbol = m.node_tree
    arbol.nodes.clear()
    salida = nodo(arbol, 'ShaderNodeOutputMaterial', 300, 0)
    emision = nodo(arbol, 'ShaderNodeEmission', 0, 0)
    emision.inputs['Color'].default_value = (*CIAN, 1)
    emision.inputs['Strength'].default_value = 22.0
    arbol.links.new(emision.outputs[0], salida.inputs['Surface'])
    luz.material_slots[0].link = 'OBJECT'
    luz.material_slots[0].material = m
    luz.visible_camera = False
    luz.visible_glossy = False
    luz.visible_shadow = False
    luz.visible_transmission = False


def postproceso():
    """Resplandor fotográfico (Glare tipo Bloom) sobre la tira y el logo."""
    e = bpy.context.scene
    ng = bpy.data.node_groups.get('PostProducto') or bpy.data.node_groups.new('PostProducto', 'CompositorNodeTree')
    ng.nodes.clear()
    if not any(i.in_out == 'OUTPUT' for i in ng.interface.items_tree):
        ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    capas = nodo(ng, 'CompositorNodeRLayers', -500, 0)
    brillo = nodo(ng, 'CompositorNodeGlare', -150, 0)
    brillo.inputs['Type'].default_value = 'Bloom'
    brillo.inputs['Quality'].default_value = 'High'
    brillo.inputs['Threshold'].default_value = 0.6
    brillo.inputs['Strength'].default_value = 0.35
    brillo.inputs['Size'].default_value = 0.55
    salida = nodo(ng, 'NodeGroupOutput', 200, 0)
    ng.links.new(capas.outputs['Image'], brillo.inputs['Image'])
    ng.links.new(brillo.outputs['Image'], salida.inputs[0])
    e.compositing_node_group = ng


# ----------------------------------------------------------------- cámara
PLANOS_CAMARA = {
    # nombre: (posición, punto de mira, foco, focal mm, f-stop)
    'heroe': ((0.235, -0.235, 0.105), (0.002, -0.006, 0.016), (0.02, -0.03, 0.025), 85, 8.0),
    'lateral': ((0.36, -0.01, 0.045), (0, -0.003, 0.02), (0.031, -0.01, 0.022), 100, 11.0),
    'trasera': ((-0.2, 0.26, 0.14), (0, 0.01, 0.02), (0, 0.03, 0.035), 85, 8.0),
    'rueda': ((0.085, -0.2, 0.11), (0, -0.035, 0.02), (0, -0.046, 0.029), 100, 8.0),
}


def camara(plano):
    pos, mira, foco, focal, fstop = PLANOS_CAMARA[plano]
    datos = bpy.data.cameras.get('Camara') or bpy.data.cameras.new('Camara')
    cam = bpy.data.objects.get('Camara') or bpy.data.objects.new('Camara', datos)
    if cam.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(cam)
    cam.location = Vector(pos)
    cam.rotation_euler = (Vector(mira) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    datos.lens = focal
    datos.sensor_width = 36
    datos.clip_start = 0.005
    datos.dof.use_dof = True
    datos.dof.aperture_fstop = fstop
    datos.dof.aperture_blades = 7
    datos.dof.aperture_rotation = math.radians(10)
    vacio = bpy.data.objects.get('Foco') or bpy.data.objects.new('Foco', None)
    if vacio.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(vacio)
    vacio.location = Vector(foco)
    datos.dof.focus_object = vacio
    bpy.context.scene.camera = cam


def motor():
    e = bpy.context.scene
    e.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for tipo in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI'):
        try:
            prefs.compute_device_type = tipo
            prefs.get_devices()
            gpus = [d for d in prefs.devices if d.type != 'CPU']
            if gpus:
                for d in prefs.devices:
                    d.use = d.type != 'CPU'
                e.cycles.device = 'GPU'
                break
        except TypeError:
            continue
    e.cycles.samples = MUESTRAS
    e.cycles.use_denoising = True
    e.cycles.denoiser = 'OPENIMAGEDENOISE'
    e.cycles.use_adaptive_sampling = True
    e.cycles.max_bounces = 10
    e.cycles.caustics_reflective = False
    e.cycles.caustics_refractive = False
    e.render.resolution_x = ANCHO
    e.render.resolution_y = round(ANCHO * 9 / 16)
    e.render.film_transparent = False
    e.view_settings.view_transform = 'AgX'
    e.view_settings.look = 'AgX - Medium High Contrast'
    e.view_settings.exposure = 0.0
    e.render.image_settings.file_format = 'PNG'


def main():
    materiales()
    mundo()
    alfombrilla()
    luces()
    tira_luz()
    postproceso()
    motor()
    os.makedirs(SALIDA, exist_ok=True)
    rutas = []
    for plano in PLANOS:
        camara(plano)
        ruta = os.path.join(SALIDA, f'{plano}.png')
        bpy.context.scene.render.filepath = ruta
        bpy.ops.render.render(write_still=True)
        rutas.append(ruta)
    bpy.ops.wm.save_mainfile()
    return rutas


resultado_render = main()
result = {'renders': resultado_render, 'dispositivo': bpy.context.scene.cycles.device}
