"""
Giro de 360° en Cycles para el héroe de la web (fotos reales girables).

Se ejecuta sobre la escena de producto (`raton.blend` ya preparado por
`render.py`):
    blender --background modelado/raton.blend --python modelado/giro.py -- <carpeta> [--frames 72] [--ancho 1280] [--muestras 96]

Dos pasadas por fotograma, que la web suma en un <canvas>:
  base/  el ratón con la luz de estudio y la tira APAGADA (difusor lechoso),
  luz/   solo la luz de la tira en BLANCO (estudio y HDRI apagados): la tira,
         el logo, su derrame sobre el casco y la alfombrilla y el resplandor.
La web tiñe `luz` con el acento y la suma a `base` (modo 'lighter'), así que
el color se puede cambiar —y animar— sin renderizar una tanda por color.
"""

import math
import os
import sys

import bpy
from mathutils import Vector

_args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SALIDA = os.path.abspath(_args[0]) if _args else os.path.join(os.path.dirname(bpy.data.filepath), 'giro')
FRAMES = int(_args[_args.index('--frames') + 1]) if '--frames' in _args else 72
ANCHO = int(_args[_args.index('--ancho') + 1]) if '--ancho' in _args else 1280
MUESTRAS = int(_args[_args.index('--muestras') + 1]) if '--muestras' in _args else 96
PASES = [p for p in ('base', 'luz') if '--' + p in _args] or ['base', 'luz']

ESTUDIO = ('Principal', 'Recorte', 'Relleno')
FIJOS = set(ESTUDIO) | {'Alfombrilla', 'Camara', 'Foco', 'Giro'}

escena = bpy.context.scene


def giro():
    """Todas las piezas cuelgan de un vacío que da una vuelta lineal."""
    vacio = bpy.data.objects.get('Giro') or bpy.data.objects.new('Giro', None)
    if vacio.name not in escena.collection.objects:
        escena.collection.objects.link(vacio)
    vacio.location = (0, 0, 0)
    for ob in escena.objects:
        if ob.name in FIJOS or ob.parent is not None:
            continue
        ob.parent = vacio
        ob.matrix_parent_inverse = vacio.matrix_world.inverted()
    vacio.animation_data_clear()
    vacio.rotation_euler = (0, 0, 0)
    vacio.keyframe_insert('rotation_euler', index=2, frame=1)
    vacio.rotation_euler = (0, 0, -2 * math.pi)
    vacio.keyframe_insert('rotation_euler', index=2, frame=FRAMES + 1)
    _interpolacion_lineal(vacio)
    escena.frame_start = 1
    escena.frame_end = FRAMES


def _interpolacion_lineal(ob):
    # Blender 4.4+ guarda las curvas en capas/canales; se recorre lo que haya.
    accion = ob.animation_data.action
    curvas = []
    if hasattr(accion, 'fcurves'):
        curvas = list(accion.fcurves)
    if not curvas and hasattr(accion, 'layers'):
        for capa in accion.layers:
            for tira in capa.strips:
                for bolsa in tira.channelbags:
                    curvas.extend(bolsa.fcurves)
    for curva in curvas:
        for k in curva.keyframe_points:
            k.interpolation = 'LINEAR'


def camara():
    # Tres cuartos alto, como el plano «heroe», algo más lejos para que el
    # ratón quepa entero en cualquier ángulo del giro.
    cam = bpy.data.objects['Camara']
    cam.location = Vector((0.27, -0.27, 0.145))
    cam.rotation_euler = (Vector((0.0, 0.0, 0.012)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = 85
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_fstop = 11
    bpy.data.objects['Foco'].location = Vector((0, 0, 0.02))
    escena.render.resolution_x = ANCHO
    escena.render.resolution_y = round(ANCHO * 9 / 16)
    escena.render.resolution_percentage = 100
    escena.cycles.samples = MUESTRAS
    escena.cycles.use_denoising = True
    # Reutiliza BVH y texturas entre fotogramas: solo cambia una rotación.
    escena.render.use_persistent_data = True
    escena.render.image_settings.file_format = 'WEBP'
    escena.render.image_settings.quality = 88


def fondo_hdri():
    for n in escena.world.node_tree.nodes:
        if n.type == 'BACKGROUND' and n.inputs['Color'].is_linked:
            return n
    return None


def emisiones(blanco, fuerza_tira, fuerza_luz, fuerza_logo):
    def principled(nombre):
        return next(n for n in bpy.data.materials[nombre].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')

    for nombre, fuerza in (('TiraRGB', fuerza_tira), ('Logo', fuerza_logo)):
        b = principled(nombre)
        if blanco:
            b.inputs['Emission Color'].default_value = (1, 1, 1, 1)
        b.inputs['Emission Strength'].default_value = fuerza
    em = bpy.data.materials['TiraLuzSolo'].node_tree.nodes['Emission']
    if blanco:
        em.inputs['Color'].default_value = (1, 1, 1, 1)
    em.inputs['Strength'].default_value = fuerza_luz


def pase(nombre):
    hdri = fondo_hdri()
    glare = escena.compositing_node_group.nodes.get('Glare') if escena.compositing_node_group else None
    if nombre == 'base':
        for n in ESTUDIO:
            bpy.data.objects[n].hide_render = False
        hdri.inputs['Strength'].default_value = 0.35
        emisiones(True, 0.0, 0.0, 0.0)
        if glare:
            glare.mute = True
    else:
        for n in ESTUDIO:
            bpy.data.objects[n].hide_render = True
        hdri.inputs['Strength'].default_value = 0.0
        # El fondo oscuro que ve la cámara también se apaga: solo luz.
        for n in escena.world.node_tree.nodes:
            if n.type == 'BACKGROUND' and not n.inputs['Color'].is_linked:
                n.inputs['Strength'].default_value = 0.0
        emisiones(True, 1.5, 22.0, 1.1)
        if glare:
            glare.mute = False
    escena.render.filepath = os.path.join(SALIDA, nombre, '')
    bpy.ops.render.render(animation=True)
    # Restaura el fondo oscuro para la siguiente pasada.
    for n in escena.world.node_tree.nodes:
        if n.type == 'BACKGROUND' and not n.inputs['Color'].is_linked:
            n.inputs['Strength'].default_value = 1.0


def main():
    giro()
    camara()
    for p in PASES:
        pase(p)
        print('PASE', p, 'listo')


main()
