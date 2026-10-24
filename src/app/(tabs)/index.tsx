import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SimpleCheckinForm } from '@/components/simple-checkin-form';
import { Colors, Spacing } from '@/constants/theme';
import { getCheckin, type Checkin } from '@/lib/checkins';
import { manilaDate } from '@/lib/dates';
import { usesOverseerTabs } from '@/lib/profiles';
import { useSession } from '@/lib/session';

/** The first tab: Home for leaders, Today for overseers and admins. */
export default function FirstTab() {
  const { profile } = useSession();
  return usesOverseerTabs(profile?.role) ? <TodayScreen /> : <HomeScreen />;
}

// undefined = still loading (or failed), null = no check-in that day
type DayStatus = Checkin | null | undefined;

function HomeScreen() {
  const { profile } = useSession();
  const userId = profile?.id;
  const [today, setToday] = useState<DayStatus>(undefined);
  const [yesterday, setYesterday] = useState<DayStatus>(undefined);

  // useFocusEffect is like useEffect, but runs every time this tab comes back
  // into view — e.g. after finishing a check-in — so the status is always fresh.
  // useCallback keeps the same function between renders, so it doesn't re-run
  // on every render, only when userId changes or the screen is focused again.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let ignore = false;
      Promise.all([getCheckin(userId, manilaDate(0)), getCheckin(userId, manilaDate(-1))]).then(
        ([todayResult, yesterdayResult]) => {
          if (ignore) return;
          setToday(todayResult);
          setYesterday(yesterdayResult);
        },
      );
      return () => {
        ignore = true;
      };
    }, [userId]),
  );

  if (!userId) return null;
  const isGuided = profile?.mode === 'guided';

  return (
    <Screen>
      <AppText variant="title">Good morning</AppText>
      <AppText variant="caption">Read · Reflect · Respond</AppText>

      <Card highlight>
        {today === undefined && <AppText variant="caption">Loading…</AppText>}

        {today && (
          <>
            <AppText variant="heading">You’ve checked in today ✓</AppText>
            <AppText>
              {today.passage ? `You read ${today.passage}. ` : ''}Thank you for meeting with God
              today.
            </AppText>
          </>
        )}

        {today === null && (
          <>
            <AppText variant="heading">Today’s reading</AppText>
            <AppText>Done your RRR in your notebook? Check in here.</AppText>
            {isGuided ? (
              <Button title="Start today’s RRR" onPress={() => router.push('/check-in')} />
            ) : (
              <SimpleCheckinForm
                userId={userId}
                readingDate={manilaDate(0)}
                buttonTitle="I’ve done my RRR today"
                onSaved={() => router.push('/check-in/done')}
              />
            )}
          </>
        )}
      </Card>

      {yesterday === null && (
        <Link
          href={{ pathname: '/check-in', params: { date: manilaDate(-1) } }}
          style={styles.link}>
          <AppText style={styles.linkText}>Read yesterday but didn’t check in? Check in for yesterday</AppText>
        </Link>
      )}
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
          Your leaders’ check-ins will show up here. Coming in Phase 6.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: {
    padding: Spacing.sm,
  },
  linkText: {
    color: Colors.primary,
  },
});
