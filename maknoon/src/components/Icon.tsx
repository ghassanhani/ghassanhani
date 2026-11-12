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
} as const;

export type IconName = keyof typeof icons;

export function Icon({ name, size = 24, color = colors.ink, strokeWidth = 1.5 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  // Fixed-size, non-shrinking box so flex rows never squeeze the glyph.
  return (
    <View style={{ width: size, height: size, flexShrink: 0 }}>
      <HugeiconsIcon icon={icons[name]} size={size} color={color} strokeWidth={strokeWidth} />
    </View>
  );
}
