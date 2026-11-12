import { Screen } from '@/components/Screen';
import { Caption, Display } from '@/components/Typography';
import { GlassCard } from '@/components/ui';

// «أنا» (notes, hifz, settings) is designed on the canvas (Me / Settings / Plus) and comes in the next batch.
export default function MeScreen() {
  return (
    <Screen backdrop="sand">
      <Display size={30} lineHeight={44} style={{ marginTop: 8 }}>
        أنا
      </Display>
      <GlassCard>
        <Caption>الملاحظات والحفظ والإعدادات — في الدفعة التالية من الشاشات.</Caption>
      </GlassCard>
    </Screen>
  );
}
