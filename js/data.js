// Content model for the Vers prototype. Loaded as a plain script before app.js so the
// site works straight from the file system (no server needed).
// Pictures are the atomic unit: every picture belongs to a project and carries
// the facets used by the "Show me more by […]" control.

const PROJECTS = [
  {
    id: 'house-011',
    title: 'House 011, 2018',
    date: '02 12 24',
    location: 'Spain',
    size: '277 m²',
    awards: ['Awards', 'Awards', 'Awards', 'Awards', 'Awards', 'Awards'],
    hero: 'assets/photos/project-hero.jpg',
    description: [
      'The size of each piece responds to the program: The first, access, welcomes a space for reading and music and in its doublé height, the study. A second volum for the kitchen, dining room and living room. The third and fourth volums house the rooms.',
      'All of them are connected through transitional spaces as walkways. From the inside, you look towards an exterior (the garden) and at the same time an interior that is a small landscape (the patio).',
    ],
  },
  {
    id: 'casa-vora',
    title: 'Casa Vora, 2021',
    date: '14 03 24',
    location: 'Portugal',
    size: '190 m²',
    awards: ['Awards', 'Awards', 'Awards'],
    hero: 'assets/photos/p04.jpg',
    description: [
      'A single-storey house folded around a courtyard. The brick shell is left raw inside and out, so the same material carries you from the street to the bedroom.',
      'Openings are cut where the light is useful rather than where the plan is symmetric. The result is a quiet sequence of rooms that borrow their colour from the hour of the day.',
    ],
  },
  {
    id: 'studio-pati',
    title: 'Studio Pati, 2023',
    date: '27 06 24',
    location: 'Spain',
    size: '84 m²',
    awards: ['Awards', 'Awards'],
    hero: 'assets/photos/p08.jpg',
    description: [
      'A workshop and a home share one long room. A curtain, a shelf and a step are the only partitions, and each can be moved in a morning.',
      'Timber, plaster and linen keep the palette to three notes so the objects made here become the colour.',
    ],
  },
  {
    id: 'loft-serra',
    title: 'Loft Serra, 2020',
    date: '09 10 24',
    location: 'Spain',
    size: '142 m²',
    awards: ['Awards', 'Awards', 'Awards', 'Awards'],
    hero: 'assets/photos/p10.jpg',
    description: [
      'Two rooms carved from a former printing floor. The original concrete frame stays visible and everything new is lighter than it: wood, glass, fabric.',
      'A skylight brought down through the roof feeds a small interior garden that the whole plan turns around.',
    ],
  },
];

const PICTURES = [
  { id: 'p01', src: 'assets/photos/p01.jpg', w: 397, h: 556, project: 'house-011', caption: 'To fulfil a dream, you need a gesture.', materials: 'ceramic', patterns: 'plain', colors: 'ivory' },
  { id: 'p02', src: 'assets/photos/p02.jpg', w: 669, h: 669, project: 'casa-vora', caption: 'Brick that remembers the kiln.', materials: 'brick', patterns: 'bond', colors: 'terracotta' },
  { id: 'p03', src: 'assets/photos/p03.jpg', w: 562, h: 748, project: 'house-011', caption: 'A curtain is a wall you can forgive.', materials: 'linen', patterns: 'fold', colors: 'white' },
  { id: 'p04', src: 'assets/photos/p04.jpg', w: 664, h: 665, project: 'casa-vora', caption: 'The garden waits behind the metal.', materials: 'steel', patterns: 'stripe', colors: 'graphite' },
  { id: 'p05', src: 'assets/photos/p05.jpg', w: 416, h: 555, project: 'studio-pati', caption: 'Yellow, folded twice.', materials: 'linen', patterns: 'fold', colors: 'ochre' },
  { id: 'p06', src: 'assets/photos/p06.jpg', w: 665, h: 665, project: 'studio-pati', caption: 'Plans are pictures of patience.', materials: 'paper', patterns: 'grid', colors: 'white' },
  { id: 'p07', src: 'assets/photos/p07.jpg', w: 562, h: 562, project: 'loft-serra', caption: 'Steel in a basket.', materials: 'steel', patterns: 'weave', colors: 'silver' },
  { id: 'p08', src: 'assets/photos/p08.jpg', w: 671, h: 670, project: 'studio-pati', caption: 'A room made of one wood.', materials: 'timber', patterns: 'plain', colors: 'honey' },
  { id: 'p09', src: 'assets/photos/p09.jpg', w: 420, h: 559, project: 'loft-serra', caption: 'Desk, lamp, and the afternoon.', materials: 'timber', patterns: 'plain', colors: 'honey' },
  { id: 'p10', src: 'assets/photos/p10.jpg', w: 669, h: 669, project: 'loft-serra', caption: 'The skylight is the only door.', materials: 'concrete', patterns: 'plain', colors: 'grey' },
  { id: 'p11', src: 'assets/photos/p11.jpg', w: 560, h: 560, project: 'house-011', caption: 'Bed, wall, window: enough.', materials: 'plaster', patterns: 'plain', colors: 'ivory' },
];

const BY_OPTIONS = ['materials', 'project', 'patterns', 'colors'];
const BY_NONE = 'not selected'; // shown in the bar until a facet is chosen
const AS_OPTIONS = ['room', 'list', 'grid'];

// The hero "room" is the 1440 × 960 Figma frame. Each panel is one of the
// wireframe's grey parallelograms; `depth` drives the drag parallax (0 = far
// wall, 1 = nearest the camera) and `pic` is the picture it reveals on hover.
const ROOM = {
  width: 1440,
  height: 960,
  panels: [
    { id: 'r36', x: -13, y: -76, w: 241.158, h: 428.28, d: 'M0 0L241.158 73.1303V428.28L0 390.777V0Z', fill: '#E0E0E0', depth: 0.55, pic: 'p11' },
    { id: 'r22', x: 469, y: 67, w: 241.158, h: 489.166, d: 'M0 0L241.158 73.1303V477.901L0 489.166V0Z', fill: '#E0E0E0', depth: 0.25, pic: 'p01' },
    { id: 'r34', x: 612, y: -14, w: 499.817, h: 201.815, d: 'M0 125.627L196.726 0L499.817 120.793L258.017 201.815L0 125.627Z', fill: '#5B5B5B', depth: 0.9, pic: 'p06' },
    { id: 'r37', x: 804, y: -61, w: 546.443, h: 168.376, d: 'M0 47.1207L306.25 0L546.443 89.1048L306.25 168.376L0 47.1207Z', fill: '#AEADAD', depth: 0.95, pic: 'p02' },
    { id: 'r35', x: 1111, y: 27, w: 240.196, h: 340.445, d: 'M0.000893712 80.3311L240.196 0V291.604L0 340.445L0.000893712 80.3311Z', fill: '#CBCBCB', depth: 0.6, pic: 'p04' },
    { id: 'r29', x: 706, y: 140, w: 161.341, h: 275.012, d: 'M0 0L161.341 48.5074V275.012L0.00182772 246.389L0 0Z', fill: '#B4B4B4', depth: 0.3, pic: 'p03' },
    { id: 'r33', x: 228, y: 194, w: 107.379, h: 174.23, d: 'M0 0L107.379 25.0901V174.23L0 157.752L0 0Z', fill: '#B4B4B4', depth: 0.45, pic: 'p05' },
    { id: 'r32', x: 64, y: 328, w: 163.683, h: 247.795, d: 'M0 0L163.683 24.2719V239.557L0 247.795V0Z', fill: '#B4B4B4', depth: 0.6, pic: 'p02' },
    { id: 'r26', x: 869, y: 365, w: 241.158, h: 456.56, d: 'M0 49.6682L241.158 0V456.56L0.959878 404.781L0 49.6682Z', fill: '#D9D9D9', depth: 0.4, pic: 'p08' },
    { id: 'r30', x: 469, y: 548, w: 167.982, h: 144.702, d: 'M0 8.2113L167.982 0V119.216L0 144.702V8.2113Z', fill: '#B4B4B4', depth: 0.3, pic: 'p06' },
    { id: 'r25', x: 228, y: 556, w: 241.158, h: 371.517, d: 'M0 12.0137L241.158 0V311.372L0 371.517V12.0137Z', fill: '#D9D9D9', depth: 0.5, pic: 'p09' },
    { id: 'r28', x: 1110, y: 570, w: 114.329, h: 276.166, d: 'M0 10.6951L114.329 0V276.166L0.000480652 252.231L0 10.6951Z', fill: '#B4B4B4', depth: 0.6, pic: 'p07' },
    { id: 'r31', x: 637, y: 634, w: 230.59, h: 192.17, d: 'M0 32.8096L230.59 0V135.213L0 192.17V32.8096Z', fill: '#8B8B8B', depth: 0.35, pic: 'p10' },
    { id: 'r27', x: 1224, y: 723, w: 240.199, h: 174.79, d: 'M0 0L240.199 7.80176V174.79L0.000893712 123.011L0 0Z', fill: '#D9D9D9', depth: 0.7, pic: 'p09' },
    { id: 'r38', x: 469, y: 807, w: 483.709, h: 179.068, d: 'M0 58.36L241.158 0L483.709 83.3828L256.798 179.068L0 58.36Z', fill: '#D1D1D1', depth: 0.85, pic: 'p08' },
    { id: 'r23', x: 1030, y: 820, w: 192.437, h: 71.8766, d: 'M0 38.7738L77.6412 0L192.437 24.7672L119.607 71.8766L0 38.7738Z', fill: '#D1D1D1', depth: 0.9, pic: 'p11' },
    { id: 'r39', x: 727, y: 858, w: 427.061, h: 199.123, d: 'M0 127.265L302.956 0L427.061 33.6633L148.699 199.123L0 127.265Z', fill: '#B8B8B8', depth: 0.95, pic: 'p04' },
    { id: 'r24', x: 1150, y: 844, w: 185.348, h: 84.6095, d: 'M0 47.1346L73.2217 0L185.348 24.3L136.47 84.6095L0 47.1346Z', fill: '#C2C2C2', depth: 0.95, pic: 'p07' },
  ],
  // Perspective guide lines from the wireframe (1px strokes).
  guides: [
    { x: 869, y: -8, d: 'M0 195.824L582.273 0L582.273 902.870L0 778.097L0 195.824Z' },
    { x: -551, y: -159, d: 'M0 347.470L1148.219 0L1419.338 1278.807L0 929.743L0 347.470Z' },
    { x: -370, y: 263, d: 'M0 185.807L1238.464 0' },
  ],
};

const ABOUT = {
  title: 'About us',
  photo: 'assets/photos/about-team.jpg',
  paragraphs: [
    'The size of each piece responds to the program: The first, access, welcomes a space for reading and music and in its doublé height, the study. A second volum for the kitchen, dining room and living room. The third and fourth volums house the rooms.',
    'All of them are connected through transitional spaces as walkways. From the inside, you look towards an exterior (the garden) and at the same time an interior that is a small landscape (the patio).',
  ],
};
