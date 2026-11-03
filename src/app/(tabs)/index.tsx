import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SimpleCheckinForm } from '@/components/simple-checkin-form';
import { StreakWeekCard } from '@/components/home/streak-week-card';
import { TodayReadingCard } from '@/components/home/today-reading-card';
import { Colors, Fonts, Spacing, TileColors } from '@/constants/theme';
import { getCheckin, type Checkin } from '@/lib/checkins';
import { formatLongDate, formatShortDate, manilaDate, manilaHour } from '@/lib/dates';
import { usesOverseerTabs } from '@/lib/profiles';
import { ENCOURAGEMENTS, getEncouragements, type Encouragement } from '@/lib/friends';
import { getPlan, type Plan, type PlanDay } from '@/lib/plans';
import { getLeaderHistory, getLeadersToday, getStreak, type LeaderToday, type Streak } from '@/lib/progress';
import { useSession } from '@/lib/session';
import { getTodayPlanDay } from '@/lib/userPlans';

/** The first tab: Home for leaders, Today for overseers and admins. */
export default function FirstTab() {
  const { profile } = useSession();
  return usesOverseerTabs(profile?.role) ? <TodayScreen /> : <HomeScreen />;
}

type HomeData = {
  // undefined = failed to load, null = no check-in that day
  today: Checkin | null | undefined;
  yesterday: Checkin | null | undefined;
  /** The plan today's check-in was for, if any. */
  todayCheckinPlan: Plan | null;
  streak: Streak | null;
  readThisWeek: Set<string>;
  planToday: { plan: Plan; day: PlanDay } | null;
  /** Encouragements from friends that haven't been seen yet. */
  newEncouragements: Encouragement[];
};

/** "Maayong buntag" (morning), "Maayong hapon" (afternoon) or "Maayong gabii" (evening), in Manila time. */
function greeting() {
  const hour = manilaHour();
  if (hour < 12) return 'Maayong buntag';
  if (hour < 18) return 'Maayong hapon';
  return 'Maayong gabii';
}

/** "John: A 21-Day Devotional" → "John" */
function shortPlanName(plan: Plan) {
  return plan.title.split(':')[0];
}

function HomeScreen() {
  const { profile } = useSession();
  const userId = profile?.id;
  // undefined = still loading
  const [data, setData] = useState<HomeData | undefined>(undefined);

  // useFocusEffect is like useEffect, but runs every time this tab comes back
  // into view — e.g. after finishing a check-in — so the status is always fresh.
  // useCallback keeps the same function between renders, so it doesn't re-run
  // on every render, only when userId changes or the screen is focused again.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let ignore = false;
      async function load(id: string) {
        const [today, yesterday, streak, history, planToday, received] = await Promise.all([
          getCheckin(id, manilaDate(0)),
          getCheckin(id, manilaDate(-1)),
          getStreak(id),
          getLeaderHistory(id, 7),
          getTodayPlanDay(id),
          getEncouragements(),
        ]);
        const todayCheckinPlan = today?.plan_id ? await getPlan(today.plan_id) : null;
        if (ignore) return;
        setData({
          today,
          yesterday,
          todayCheckinPlan,
          streak,
          readThisWeek: new Set((history ?? []).map((day) => day.reading_date)),
          planToday,
          newEncouragements: (received ?? []).filter((e) => !e.read),
        });
      }
      load(userId);
      return () => {
        ignore = true;
      };
    }, [userId]),
  );

  if (!userId || !profile) return null;
  const firstName = profile.full_name.trim().split(/\s+/)[0] ?? '';
  const isGuided = profile.mode === 'guided';

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText style={styles.date}>{formatLongDate(manilaDate(0))}</AppText>
          <AppText style={styles.greeting}>
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </AppText>
        </View>
        <Pressable
          style={styles.avatar}
          onPress={() => router.navigate('/profile')}
          accessibilityRole="button"
          accessibilityLabel="Profile">
          <AppText style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</AppText>
        </Pressable>
      </View>

      {data && data.newEncouragements.length > 0 && (
        <Pressable onPress={() => router.navigate('/friends')} accessibilityRole="button">
          <Card highlight>
            <AppText>
              💛 <AppText style={styles.bold}>{data.newEncouragements[0].from}</AppText>:{' '}
              {ENCOURAGEMENTS[data.newEncouragements[0].kind]}
            </AppText>
            {data.newEncouragements.length > 1 && (
              <AppText variant="caption">+ {data.newEncouragements.length - 1} more from your friends</AppText>
            )}
          </Card>
        </Pressable>
      )}

      {data?.streak && <StreakWeekCard streak={data.streak} readDates={data.readThisWeek} />}

      {data === undefined && <AppText variant="caption">Loading…</AppText>}
      {data && <TodayCard data={data} userId={userId} isGuided={isGuided} />}

      {data?.yesterday === null && (
        <Link href={{ pathname: '/check-in', params: { date: manilaDate(-1) } }} style={styles.link}>
          <AppText style={styles.linkText}>Read yesterday but didn’t check in? Check in for yesterday</AppText>
        </Link>
      )}

    </Screen>
  );
}

/** "Today's reading": done, today's plan day, or a free choice of passage. */
function TodayCard({ data, userId, isGuided }: { data: HomeData; userId: string; isGuided: boolean }) {
  const { today, todayCheckinPlan, planToday } = data;

  if (today) {
    return (
      <TodayReadingCard
        badge={todayCheckinPlan && today.plan_day ? `${shortPlanName(todayCheckinPlan)} · Day ${today.plan_day}` : undefined}
        title={today.passage ?? 'Done for today'}
        description="You’ve checked in today ✓ Thank you for meeting with God today."
      />
    );
  }

  if (planToday) {
    const { plan, day } = planToday;
    return (
      <TodayReadingCard
        badge={`${shortPlanName(plan)} · Day ${day.day}`}
        title={day.passage}
        description="Read, then reflect and respond in your notebook. About 15 minutes.">
        <Button
          title="Start today’s RRR"
          onPress={() =>
            router.push({ pathname: '/check-in', params: { planId: plan.id, planDay: String(day.day) } })
          }
        />
      </TodayReadingCard>
    );
  }

  return (
    <TodayReadingCard
      title="Your daily RRR"
      description={
        isGuided
          ? 'Read any passage, then reflect and respond in your notebook.'
          : 'Done your RRR in your notebook? Check in here.'
      }>
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
      <Pressable
        onPress={() => router.navigate({ pathname: '/bible', params: { view: 'plans' } })}
        accessibilityRole="link">
        <AppText style={styles.linkText}>Or follow a reading plan ›</AppText>
      </Pressable>
    </TodayReadingCard>
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
  bold: {
    fontFamily: Fonts.semiBold,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  date: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  greeting: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.text,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TileColors.green,
  },
  avatarText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.primary,
  },
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
