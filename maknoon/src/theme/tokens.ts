/**
 * Design tokens taken from the Maknoon design canvas
 * (rows 1–2 are Figma renders; rows 3–5 hand-coded in the same language).
 */
export const colors = {
  primary: '#035A5F', // teal — CTAs, active tab, links
  primaryBright: '#0C8B91',
  ink: '#272833', // headings + body
  inkDeep: '#141B34',
  muted: '#818290', // captions
  hairline: '#E2E2E2',
  ring: '#EFEFEF',
  white: '#FFFFFF',
  gold: '#D9BC85', // "الصلاة القادمة" label on dark cards
  goldWarm: '#E3C58C',
  sky: '#3AAADA', // progress "on"
  track: 'rgba(129,130,144,0.3)', // progress "off"
  glass: 'rgba(255,255,255,0.7)',
  glassSoft: 'rgba(255,255,255,0.61)',
  tabBar: 'rgba(255,255,255,0.5)',
  // chips
  reviewedFrom: '#84C57D',
  reviewedTo: '#A0E298',
  reviewedInk: '#16660D',
  suggestedFrom: '#7DBAC5',
  suggestedTo: '#95D8E4',
  suggestedInk: '#0D5A66',
  pendingFrom: '#E8CF9A',
  pendingTo: '#F3E2B9',
  pendingInk: '#6B4E14',
} as const;

export const radius = {
  card: 36,
  inner: 20,
  soft: 30,
  pill: 999,
} as const;

/** Every rounded box uses 94% corner smoothing (Figma squircle). */
export const CORNER_SMOOTHING = 0.94;

export const space = {
  gutter: 24, // screen side padding (402pt frame → 354pt cards)
  gap: 16,
  cardPad: 22,
} as const;

export const FRAME_WIDTH = 402; // iPhone 17

/** Coloured blobs that tint the inside of glass cards (blur 50, 20% in the canvas: soft, never saturated). */
export type Blob = {
  color: string;
  opacity?: number;
  /** centre, as fractions of the card box */
  cx: number;
  cy: number;
  /** radii, as fractions of the card box */
  rx: number;
  ry: number;
  /** real Gaussian blur (Figma layer blur) instead of the radial-gradient stand-in */
  blur?: number;
  /** Figma progressive blur: blurred along `dir` until `from`, sharp (blur 2) after `to` (fractions of the gradient line) */
  fade?: { dir: [number, number]; from: number; to: number };
};

export const tints = {
  /** Home light cards: teal / sky / rose at 20% */
  neutral: [
    { color: '#035A5F', opacity: 0.2, cx: 0.1, cy: 1.05, rx: 0.75, ry: 0.75 },
    { color: '#7DB3C5', opacity: 0.2, cx: 0.95, cy: 0.9, rx: 0.6, ry: 0.9 },
    { color: '#C57D7E', opacity: 0.2, cx: 0.6, cy: 1.3, rx: 0.8, ry: 0.8 },
  ],
  lavender: [
    { color: '#7D7FC5', opacity: 0.2, cx: 0.5, cy: 1.0, rx: 0.8, ry: 0.5 },
    { color: '#7DB3C5', opacity: 0.15, cx: 1.0, cy: 0.6, rx: 0.6, ry: 0.8 },
  ],
  mint: [
    { color: '#7FC57D', opacity: 0.2, cx: 0.9, cy: 0.9, rx: 0.7, ry: 0.7 },
    { color: '#BADA47', opacity: 0.12, cx: 0.1, cy: 1.0, rx: 0.8, ry: 0.6 },
  ],
  peach: [
    { color: '#C57D7E', opacity: 0.18, cx: 0.0, cy: 1.0, rx: 0.8, ry: 0.8 },
    { color: '#E8CF9A', opacity: 0.18, cx: 0.2, cy: 0.2, rx: 0.5, ry: 0.6 },
  ],
} satisfies Record<string, Blob[]>;

/** Dark hero cards. */
export const heroes = {
  night: {
    fill: '#0C1140',
    // Exact ellipses of the canvas card (354 × 249): blur 50, progressive edge at -159°
    blobs: [
      { color: '#7D7FC5', cx: 0.364, cy: 0.906, rx: 0.364, ry: 0.291, blur: 50, fade: { dir: [-0.358, 0.934], from: 0.39, to: 0.66 } },
      { color: '#7DB3C5', cx: 0.973, cy: 0.855, rx: 0.281, ry: 0.711, blur: 50, fade: { dir: [0.934, 0.358], from: 0.367, to: 0.693 } },
      { color: '#C57D7E', cx: 0.725, cy: 1.783, rx: 0.366, ry: 0.928, blur: 50, fade: { dir: [0.934, 0.358], from: 0.348, to: 0.721 } },
    ] as Blob[],
  },
  teal: {
    fill: '#035A5F',
    blobs: [
      { color: '#BADA47', opacity: 0.55, cx: 0.1, cy: 1.05, rx: 0.7, ry: 0.5 },
      { color: '#7FC57D', opacity: 0.5, cx: 0.95, cy: 0.95, rx: 0.6, ry: 0.5 },
    ] as Blob[],
  },
  ocean: {
    fill: '#0B4586',
    blobs: [
      { color: '#ACA711', opacity: 0.4, cx: 0.1, cy: 1.0, rx: 0.6, ry: 0.6 },
      { color: '#7FC57D', opacity: 0.3, cx: 0.9, cy: 1.0, rx: 0.6, ry: 0.5 },
      { color: '#7D93C5', opacity: 0.5, cx: 0.6, cy: 0.1, rx: 0.6, ry: 0.5 },
    ] as Blob[],
  },
  forest: {
    fill: '#2F6B4F',
    blobs: [
      { color: '#BADA47', opacity: 0.55, cx: 0.05, cy: 0.9, rx: 0.6, ry: 0.6 },
      { color: '#7FC57D', opacity: 0.6, cx: 0.9, cy: 1.1, rx: 0.7, ry: 0.6 },
    ] as Blob[],
  },
} as const;

export type HeroName = keyof typeof heroes;
export type TintName = keyof typeof tints;
