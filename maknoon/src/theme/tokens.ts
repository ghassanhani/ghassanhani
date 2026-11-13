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
  /** draw the blur with a real SVG filter (costly; hero cards only). Otherwise a gradient follows the same blur curve. */
  exact?: boolean;
};

/**
 * The canvas lights: every card carries the same three Figma ellipses (blur 50, progressive edge),
 * placed at fixed offsets from the card's top-left and tinted per card. Sizes are the canvas card size (pt).
 * `x` shifts all three (0 on full-width cards, -183 on half cards, -235 on the small rail cards);
 * `e1` moves the first light where a card does so.
 */
export function lights(
  W: number,
  H: number,
  [c1, c2, c3]: [string, string, string],
  { x = 0, e1, opacity = 1, exact = false }: { x?: number; e1?: [number, number]; opacity?: number; exact?: boolean } = {},
): Blob[] {
  const [x1, y1] = e1 ?? [x, 153.125];
  return [
    { color: c1, opacity, exact, blur: 50, cx: (x1 + 129) / W, cy: (y1 + 72.4375) / H, rx: 129 / W, ry: 72.4375 / H, fade: { dir: [-0.358, 0.934], from: 0.39, to: 0.66 } },
    { color: c2, opacity, exact, blur: 50, cx: (x + 245 + 99.5) / W, cy: 213 / H, rx: 99.5 / W, ry: 177 / H, fade: { dir: [0.934, 0.358], from: 0.367, to: 0.693 } },
    { color: c3, opacity, exact, blur: 50, cx: (x + 127 + 129.5) / W, cy: 444 / H, rx: 129.5 / W, ry: 231 / H, fade: { dir: [0.934, 0.358], from: 0.348, to: 0.721 } },
  ];
}


const VIOLET = '#7D7FC5';
const ROSE = '#C57D7E';

/** Light glass cards: the canvas lights at 20%, middle colour = the card's accent. */
export const tints = {
  /** آية اليوم (354 × 189): teal light moved up and in */
  neutral: lights(354, 189, ['#035A5F', '#7DB3C5', ROSE], { e1: [-122, 82], opacity: 0.2 }),
  /** تعلّم (354 × 174) */
  sky: lights(354, 174, [VIOLET, '#3AAADA', ROSE], { opacity: 0.2 }),
  /** وردي اليوم (171 × 189) */
  lavender: lights(171, 189, [VIOLET, '#0A55F6', ROSE], { x: -183, opacity: 0.2 }),
  /** الأذكار (171 × 189) */
  mint: lights(171, 189, [VIOLET, '#0D8E14', ROSE], { x: -183, opacity: 0.2 }),
  /** مراجعة الحفظ (354 × 139) */
  peach: lights(354, 139, [VIOLET, '#DA753A', ROSE], { opacity: 0.2 }),
  /** adhkar rail (112 × 116) */
  ink: lights(112, 116, [VIOLET, '#141B34', ROSE], { x: -235, opacity: 0.2 }),
} satisfies Record<string, Blob[]>;

/** Dark hero cards. */
export const heroes = {
  night: {
    fill: '#0C1140',
    // the canvas lights at full strength, drawn with real blur filters
    blobs: lights(354, 249, [VIOLET, '#7DB3C5', ROSE], { exact: true }),
  },
  teal: {
    fill: '#035A5F',
    blobs: [
      // the canvas: teal above, a wide soft green light rising from the bottom
      { color: '#BADA47', opacity: 0.6, cx: 0.05, cy: 1.05, rx: 1.1, ry: 0.9 },
      { color: '#7FC57D', opacity: 0.9, cx: 0.95, cy: 1.05, rx: 1.1, ry: 0.9 },
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
