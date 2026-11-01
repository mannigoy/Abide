import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import type { Streak } from '@/lib/progress';

type StreakCardProps = {
  streak: Streak;
  /** Whose streak: 'you' on Home, the leader's first name on their page. */
  who?: string;
};

/** The streak, with a gentle note about this week's grace day. */
export function StreakCard({ streak, who }: StreakCardProps) {
  const days = streak.streak === 1 ? 'day' : 'days';

  return (
    <Card>
      <AppText variant="heading">
        {streak.streak > 0 ? `🔥 ${streak.streak} ${days} in a row` : '🌱 A fresh start'}
      </AppText>
      <AppText variant="caption">
        {streak.streak === 0
          ? who
            ? `${who}’s next reading starts a new streak.`
            : 'Your next reading starts a new streak.'
          : streak.graceUsedThisWeek
            ? 'This week’s grace day is used, and the streak is still going.'
            : 'One grace day this week: a single missed day won’t break the streak.'}
      </AppText>
    </Card>
  );
}
