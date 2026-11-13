import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  Bookmark01Icon,
  Books01Icon,
  Cancel01Icon,
  CheckmarkBadge02Icon,
  CompassIcon,
  Home04Icon,
  Image01Icon,
  Mic02Icon,
  BubbleChatQuestionIcon,
  CleanIcon,
  AudioWave01Icon,
  MinusSignIcon,
  MoonCloudIcon,
  Note01Icon,
  Notification01Icon,
  PaintBrush03Icon,
  PlayIcon,
  Quran01Icon,
  Quran02Icon,
  Quran03Icon,
  Ramadhan01Icon,
  Ramadhan02Icon,
  Search01Icon,
  Share05Icon,
  SparklesIcon,
  TaskDone01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { CANVAS_ICONS } from './canvasIcons';
import { colors } from '@/theme/tokens';

// The canvas uses the Hugeicons set (layer names: home-04, quran-01, books-01 …).
const icons = {
  home: Home04Icon,
  quran: Quran01Icon,
  quran2: Quran02Icon,
  quran3: Quran03Icon,
  books: Books01Icon,
  search: Search01Icon,
  user: UserIcon,
  bell: Notification01Icon,
  mic: Mic02Icon,
  help: BubbleChatQuestionIcon,
  clean: CleanIcon,
  wave: AudioWave01Icon,
  compass: CompassIcon,
  moonCloud: MoonCloudIcon,
  ramadhan1: Ramadhan01Icon,
  ramadhan2: Ramadhan02Icon,
  arrowLeft: ArrowLeft02Icon,
  arrowRight: ArrowRight02Icon,
  chevronLeft: ArrowLeft01Icon,
  chevronRight: ArrowRight01Icon,
  chevronDown: ArrowDown01Icon,
  play: PlayIcon,
  bookmark: Bookmark01Icon,
  share: Share05Icon,
  close: Cancel01Icon,
  badge: CheckmarkBadge02Icon,
  image: Image01Icon,
  plus: Add01Icon,
  minus: MinusSignIcon,
  brush: PaintBrush03Icon,
  note: Note01Icon,
  sparkle: SparklesIcon,
  list: TaskDone01Icon,
  hizb: SparklesIcon, // drawn from the canvas (rub-el-hizb)
  translation: SparklesIcon, // drawn from the canvas
  quranSolid: Quran02Icon, // the Mushaf button's solid book, drawn from the canvas
  booksSolid: Books01Icon, // the tab bar's solid variant, drawn from the canvas
} as const;

export type IconName = keyof typeof icons;

/**
 * Icons are the design canvas's own glyphs where it has them (exact Figma vectors: solid and
 * glossy styles); the rest fall back to Hugeicons stroke-rounded. `outline` forces the fallback.
 */
export function Icon({ name, size = 24, color = colors.ink, strokeWidth = 1.5, outline }: { name: IconName; size?: number; color?: string; strokeWidth?: number; outline?: boolean }) {
  const glyph = outline ? undefined : CANVAS_ICONS[name];
  // Fixed-size, non-shrinking box so flex rows never squeeze the glyph.
  return (
    <View style={{ width: size, height: size, flexShrink: 0 }}>
      {glyph ? (
        <SvgXml xml={glyph.xml} width={size} height={size} color={color} />
      ) : (
        <HugeiconsIcon icon={icons[name]} size={size} color={color} strokeWidth={strokeWidth} />
      )}
    </View>
  );
}
