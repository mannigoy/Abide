import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { usesOverseerTabs } from '@/lib/profiles';
import { useSession } from '@/lib/session';

/** The first tab: Home for leaders, Today for overseers and admins. */
export default function FirstTab() {
  const { profile } = useSession();
  return usesOverseerTabs(profile?.role) ? <TodayScreen /> : <HomeScreen />;
}

function HomeScreen() {
  return (
    <Screen>
      <AppText variant="title">Good morning</AppText>
      <AppText variant="caption">Read · Reflect · Respond</AppText>

      <Card highlight>
        <AppText variant="heading">Today’s reading</AppText>
        <AppText>
          When you’ve done your RRR in your notebook, you’ll check in here. Coming in Phase 3.
        </AppText>
      </Card>
    </Screen>
  );
}

function TodayScreen() {
  return (
    <Screen>
      <AppText variant="title">Today</AppText>
      <AppText variant="caption">See who has read today and encourage the rest.</AppText>

      <Card highlight>
        <AppText variant="heading">Who read today</AppText>
        <AppText>
          Your leaders’ check-ins will show up here once they can check in. Coming in Phase 6.
        </AppText>
      </Card>
    </Screen>
  );
}
