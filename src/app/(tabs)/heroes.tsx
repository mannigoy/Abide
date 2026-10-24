import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';

export default function HeroesScreen() {
  return (
    <Screen>
      <AppText variant="title">My Bible Heroes</AppText>
      <AppText variant="caption">Badges and heroes are coming in Phase 7.</AppText>
    </Screen>
  );
}
