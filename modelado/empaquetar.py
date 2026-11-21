"""
Empaqueta los mapas horneados por `surge.py` (modelado/horneado/*.png) en
WebP para la web (src/escena/modelos/horneado/):

    <pieza>_normal.webp   mapa de normales en espacio tangente
    <pieza>_mat.webp      R = oclusión ambiental, G = luz de la tira

Necesita Pillow:  python modelado/empaquetar.py
"""

import os

from PIL import Image, ImageFilter

RAIZ = os.path.dirname(os.path.abspath(__file__))
ORIGEN = os.path.join(RAIZ, 'horneado')
DESTINO = os.path.join(RAIZ, '..', 'src', 'escena', 'modelos', 'horneado')

# Resolución web: las carcasas a 1024 (los mapas son de baja frecuencia y el
# ratón ocupa poco en pantalla), las piezas pequeñas a 256.
PIEZAS = {
    'CarcasaSuperior': 1024,
    'CarcasaInferior': 1024,
    'BotonLateralDelantero': 256,
    'BotonLateralTrasero': 256,
    'BotonDPI': 256,
    'Bandeja': 256,
}


def main():
    os.makedirs(DESTINO, exist_ok=True)
    for pieza, res in PIEZAS.items():
        normal = Image.open(os.path.join(ORIGEN, f'{pieza}_normal.png')).convert('RGB')
        normal.resize((res, res), Image.LANCZOS).save(
            os.path.join(DESTINO, f'{pieza}_normal.webp'), 'WEBP', quality=92, method=6)

        ao = Image.open(os.path.join(ORIGEN, f'{pieza}_ao.png')).convert('L')
        ao = ao.resize((res, res), Image.LANCZOS)
        # La luz de la tira sale con grano de muestreo: se desenfoca y se
        # descarta lo que no llega al 6 % (ahí no alumbra la tira).
        luz = Image.open(os.path.join(ORIGEN, f'{pieza}_luz.png')).convert('L')
        luz = luz.filter(ImageFilter.GaussianBlur(3 if res > 512 else 1.5))
        luz = luz.resize((res, res), Image.LANCZOS)
        luz = luz.point(lambda v: 0 if v < 16 else min(255, round((v - 16) * 255 / 239)))
        negro = Image.new('L', (res, res), 0)
        Image.merge('RGB', (ao, luz, negro)).save(
            os.path.join(DESTINO, f'{pieza}_mat.webp'), 'WEBP', quality=90, method=6)
        print(pieza, res)


if __name__ == '__main__':
    main()
