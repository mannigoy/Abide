import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SimpleCheckinForm } from '@/components/simple-checkin-form';
import { StreakCard } from '@/components/streak-card';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { getCheckin, type Checkin } from '@/lib/checkins';
import { formatShortDate, manilaDate } from '@/lib/dates';
import { getMyGroups } from '@/lib/groups';
import { usesOverseerTabs } from '@/lib/profiles';
import { getLeadersToday, getStreak, type LeaderToday, type Streak } from '@/lib/progress';
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
  const [hasGroup, setHasGroup] = useState(true);
  const [streak, setStreak] = useState<Streak | null>(null);

  // useFocusEffect is like useEffect, but runs every time this tab comes back
  // into view — e.g. after finishing a check-in — so the status is always fresh.
  // useCallback keeps the same function between renders, so it doesn't re-run
  // on every render, only when userId changes or the screen is focused again.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let ignore = false;
      Promise.all([
        getCheckin(userId, manilaDate(0)),
        getCheckin(userId, manilaDate(-1)),
        getMyGroups(userId),
        getStreak(userId),
      ]).then(([todayResult, yesterdayResult, groups, streakResult]) => {
        if (ignore) return;
        setToday(todayResult);
        setYesterday(yesterdayResult);
        setStreak(streakResult);
        // If loading groups failed (null), don't nag.
        setHasGroup(groups === null || groups.length > 0);
      });
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

      {!hasGroup && (
        <Card>
          <AppText variant="heading">Join your small group</AppText>
          <AppText>
            Ask your overseer for your group’s code so they can cheer you on.
          </AppText>
          <Button title="Enter a group code" variant="secondary" onPress={() => router.push('/profile')} />
        </Card>
      )}

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

      {streak && <StreakCard streak={streak} />}
    </Screen>
  );
}

function TodayScreen() {
  // undefined = loading, null = failed
  const [leaders, setLeaders] = useState<LeaderToday[] | null | undefined>(undefined);

  // Reload every time the tab comes into view, so it's always current.
  useFocusEffect(
    useCallback(() => {
      let ignore = false;
      getLeadersToday().then((result) => {
        if (!ignore) setLeaders(result);
      });
      return () => {
        ignore = true;
      };
    }, []),
  );

  const readToday = leaders?.filter((l) => l.checked_in_today) ?? [];
  const notYet = leaders?.filter((l) => !l.checked_in_today) ?? [];

  return (
    <Screen>
      <AppText variant="title">Today</AppText>
      <AppText variant="caption">See who has read today and encourage the rest.</AppText>

      {leaders === undefined && <AppText variant="caption">Loading…</AppText>}
      {leaders === null && (
        <AppText variant="caption">Couldn’t load your leaders. Check your connection.</AppText>
      )}
      {leaders?.length === 0 && (
        <Card>
          <AppText variant="heading">No leaders yet</AppText>
          <AppText>Create a group in the Leaders tab and share its code. Members will appear here.</AppText>
        </Card>
      )}

      {leaders && leaders.length > 0 && (
        <>
          <Card highlight>
            <AppText variant="heading">
              {readToday.length} of {leaders.length} have read today
            </AppText>
          </Card>

          {notYet.length > 0 && (
            <View style={styles.section}>
              <AppText variant="heading">Not yet today</AppText>
              <AppText variant="caption">A kind word can help. Tap a name to see how they’re doing.</AppText>
              {notYet.map((leader) => (
                <LeaderRow key={leader.user_id} leader={leader} />
              ))}
            </View>
          )}

          {readToday.length > 0 && (
            <View style={styles.section}>
              <AppText variant="heading">Read today ✓</AppText>
              {readToday.map((leader) => (
                <LeaderRow key={leader.user_id} leader={leader} />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

function LeaderRow({ leader }: { leader: LeaderToday }) {
  const detail = leader.checked_in_today
    ? leader.streak > 0
      ? `🔥 ${leader.streak} ${leader.streak === 1 ? 'day' : 'days'} in a row`
      : 'Read today'
    : leader.last_read_date
      ? `Last read ${formatShortDate(leader.last_read_date)}${leader.streak > 0 ? ` · 🔥 ${leader.streak}` : ''}`
      : 'Hasn’t checked in yet';

  return (
    <Pressable
      // A dynamic route: /leader/<their id> opens src/app/leader/[id].tsx.
      onPress={() => router.push({ pathname: '/leader/[id]', params: { id: leader.user_id } })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button">
      <View style={styles.rowText}>
        <AppText style={styles.name}>{leader.full_name}</AppText>
        <AppText variant="caption">{detail}</AppText>
      </View>
      <AppText style={styles.chevron}>›</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    padding: Spacing.sm,
  },
  linkText: {
    color: Colors.primary,
  },
  section: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: Fonts.semiBold,
  },
  chevron: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
});
