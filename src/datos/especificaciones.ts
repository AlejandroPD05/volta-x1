/**
 * Contenido técnico de la ficha del producto: hotspots de la vista
 * explosionada y rejilla de especificaciones.
 */

export type HotspotDato = {
  id: string
  titulo: string
  /** Dato grande de la tarjeta (la cifra que vende la pieza). */
  dato: string
  resumen: string
  detalles: string[]
  /** Posición del marcador con la explosión completa (mundo 3D). */
  posicion: [number, number, number]
  /** Nivel de explosión a partir del cual aparece el marcador. */
  aparece: number
  /** Hacia dónde despliega la tarjeta respecto al punto. */
  direccion: 'arriba' | 'abajo'
}

export const HOTSPOTS: HotspotDato[] = [
  {
    id: 'carcasa',
    titulo: 'Carcasa superior',
    dato: '38 g',
    resumen: 'Panal de abeja en ABS reforzado con fibra, impreso y ensamblado sin tornillos a la vista.',
    detalles: ['Rigidez estructural +24 %', 'Acabado SoftTouch antihuellas', 'Perfil bajo para claw-grip'],
    posicion: [0.42, 2.28, -0.3],
    aparece: 0.82,
    direccion: 'abajo',
  },
  {
    id: 'botones',
    titulo: 'Clickers ópticos',
    dato: '0.2 ms',
    resumen: 'Switches ópticos Gen-3: el clic se dispara con luz, sin rebote mecánico.',
    detalles: ['100 M de pulsaciones garantizadas', 'Fuerza de accionamiento 55 g', 'Pre-travel de 0.1 mm'],
    posicion: [0.38, 1.5, 0.46],
    aparece: 0.58,
    direccion: 'arriba',
  },
  {
    id: 'rueda',
    titulo: 'Rueda + encoder',
    dato: '24 pasos',
    resumen: 'Encoder óptico con rueda texturizada en silicona y hub de luz RGB.',
    detalles: ['Giro preciso sin desgaste', 'Clic central silencioso', 'Textura antideslizante'],
    posicion: [-0.4, 1.66, 0.42],
    aparece: 0.7,
    direccion: 'arriba',
  },
  {
    id: 'pcb',
    titulo: 'PCB — el cerebro',
    dato: '30 000 DPI',
    resumen: 'Placa de doble cara con el sensor FLUX-30K y un MCU de 8 000 Hz.',
    detalles: ['750 IPS · 50 G de aceleración', 'Latencia total de 0.125 ms', 'LEDs RGB direccionables'],
    posicion: [-0.42, 1.1, 0.34],
    aparece: 0.4,
    direccion: 'arriba',
  },
  {
    id: 'bateria',
    titulo: 'Batería + 2.4G',
    dato: '90 h',
    resumen: 'LiPo de 420 mAh y módulo inalámbrico de doble banda de bajísima latencia.',
    detalles: ['USB-C: 10 min = 12 h de juego', '2.4G a 8 000 Hz sin caídas', 'Bluetooth 5.3 de reserva'],
    posicion: [0.38, 0.65, -0.24],
    aparece: 0.26,
    direccion: 'arriba',
  },
  {
    id: 'base',
    titulo: 'Base + skates PTFE',
    dato: '0.8 mm',
    resumen: 'Base rígida con cuatro patines de PTFE virgen pulido y lente sellada.',
    detalles: ['Deslizamiento +30 %', 'Tornillos ocultos bajo los skates', 'Compatibilidad con manteles XL'],
    posicion: [-0.38, 0.14, 0.44],
    aparece: 0.12,
    direccion: 'arriba',
  },
]

export type Especificacion = {
  valor: string
  unidad: string
  titulo: string
  texto: string
}

export const ESPECIFICACIONES: Especificacion[] = [
  {
    valor: '45',
    unidad: 'g',
    titulo: 'Peso pluma',
    texto: 'Chasis de panal que elimina cada gramo sin sacrificar rigidez.',
  },
  {
    valor: '8 000',
    unidad: 'Hz',
    titulo: 'Polling inalámbrico',
    texto: '0.125 ms entre tu muñeca moviéndose y el cursor moviéndose.',
  },
  {
    valor: '30 000',
    unidad: 'DPI',
    titulo: 'Sensor FLUX-30K',
    texto: '750 IPS · 50 G de aceleración · altura de despegue ajustable.',
  },
  {
    valor: '0.2',
    unidad: 'ms',
    titulo: 'Switches ópticos',
    texto: 'Accionamiento por luz, sin rebote y con 100 M de clics de vida.',
  },
  {
    valor: '90',
    unidad: 'h',
    titulo: 'Batería',
    texto: 'Una semana de partidas por carga; 10 minutos = 12 horas.',
  },
  {
    valor: '16.8',
    unidad: 'M',
    titulo: 'Colores RGB',
    texto: 'Iluminación direccionable sincronizada con tu setup por software.',
  },
]
