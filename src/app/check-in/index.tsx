import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PassageSheet } from '@/components/bible/passage-sheet';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { NotebookScanButtons } from '@/components/notebook-scan-buttons';
import { PassagePicker } from '@/components/passage-picker';
import { Screen } from '@/components/screen';
import { SimpleCheckinForm } from '@/components/simple-checkin-form';
import { TextField } from '@/components/text-field';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { createCheckin } from '@/lib/checkins';
import { isCheckinDateAllowed, manilaDate } from '@/lib/dates';
import type { Plan, PlanDay } from '@/lib/plans';
import type { RrrText } from '@/lib/rrr-text';
import { useSession } from '@/lib/session';
import { completePlanDay, getTodayPlanDay } from '@/lib/userPlans';

type PlanToday = { plan: Plan; day: PlanDay };

/**
 * Check-in for today, or yesterday via `/check-in?date=YYYY-MM-DD`.
 * Guided leaders get the three RRR steps; Simple leaders get the one-tap form.
 *
 * From a reading plan: `/check-in?planId=john-21-day&planDay=3`. That's always
 * Guided (plans are guided RRR) and always for today.
 */
export default function CheckinScreen() {
  const { profile } = useSession();
  const userId = profile?.id;
  // useLocalSearchParams reads values from the URL, like ?date=2026-10-23.
  const params = useLocalSearchParams<{ date?: string; planId?: string; planDay?: string }>();
  const { planId, planDay } = params;

  // undefined = still loading; null = not a plan check-in (or that day isn't today's any more)
  const [planToday, setPlanToday] = useState<PlanToday | null | undefined>(planId ? undefined : null);
  useEffect(() => {
    if (!planId || !userId) return;
    let ignore = false;
    // Double-check it's really the user's current plan day, in case the link is old.
    getTodayPlanDay(userId).then((today) => {
      const matches = today && today.plan.id === planId && String(today.day.day) === planDay;
      if (!ignore) setPlanToday(matches ? today : null);
    });
    return () => {
      ignore = true;
    };
  }, [planId, planDay, userId]);

  const readingDate =
    !planId && params.date && isCheckinDateAllowed(params.date) ? params.date : manilaDate(0);
  const dayLabel = readingDate === manilaDate(0) ? 'today' : 'yesterday';

  if (!profile || planToday === undefined) return null;

  // router.replace swaps this screen for the celebration, so "back" goes home, not here.
  const goToDone = (planMessage?: string) =>
    router.replace({ pathname: '/check-in/done', params: planMessage ? { planMessage } : {} });

  if (profile.mode === 'guided' || planToday) {
    return (
      <GuidedCheckin
        userId={profile.id}
        readingDate={readingDate}
        dayLabel={dayLabel}
        planToday={planToday}
        onSaved={goToDone}
      />
    );
  }

  return (
    <Screen>
      <AppText variant="title">Check in for {dayLabel}</AppText>
      <Card highlight>
        <SimpleCheckinForm
          userId={profile.id}
          readingDate={readingDate}
          buttonTitle={`I did my RRR ${dayLabel}`}
          onSaved={() => goToDone()}
        />
      </Card>
      <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Guided mode: Read → Reflect → Respond
// ---------------------------------------------------------------------------

// Read → Reflect → Respond guide the leader through their notebook; the last
// step scans the page (or lets them type) and lets them fix the text.
const STEPS = [
  {
    title: 'Read',
    intro: 'Which passage are you reading?',
    prompts: [] as string[],
  },
  {
    title: 'Reflect',
    intro: 'Think about what you read.',
    prompts: ['What does this show you about God?', 'What stood out to you?'],
  },
  {
    title: 'Respond',
    intro: 'Bring it into your day.',
    prompts: ['What will you do or pray about today?'],
  },
  {
    title: 'Review',
    intro: 'Scan your notebook page, then check the text. Everything here is optional.',
    prompts: [] as string[],
  },
];
const REVIEW_STEP = STEPS.length - 1;

/** Adds scanned text after anything already typed, so nothing is lost. */
function append(existing: string, scanned: string) {
  if (!scanned) return existing;
  return existing.trim() ? `${existing.trim()}\n${scanned}` : scanned;
}

type GuidedCheckinProps = {
  userId: string;
  readingDate: string;
  dayLabel: string;
  /** Set when this RRR is a reading plan's day: its passage and questions are used. */
  planToday: PlanToday | null;
  /** `planMessage` is shown on the celebration screen, e.g. "Day 3 of John done". */
  onSaved: (planMessage?: string) => void;
};

function GuidedCheckin({ userId, readingDate, dayLabel, planToday, onSaved }: GuidedCheckinProps) {
  const [step, setStep] = useState(0);
  const [passage, setPassage] = useState(planToday?.day.passage ?? '');
  const [reading, setReading] = useState(false);
  const [text, setText] = useState<RrrText>({ read: '', reflect: '', respond: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = STEPS[step];
  const isLastStep = step === REVIEW_STEP;
  // A plan day brings its own Reflect questions.
  const prompts = planToday && current.title === 'Reflect' ? planToday.day.reflectionQuestions : current.prompts;

  function updatePart(part: keyof RrrText, value: string) {
    // State should be replaced, not changed in place, so React notices the change.
    setText((previous) => ({ ...previous, [part]: value }));
  }

  function handleScanned(scanned: RrrText) {
    setText((previous) => ({
      read: append(previous.read, scanned.read),
      reflect: append(previous.reflect, scanned.reflect),
      respond: append(previous.respond, scanned.respond),
    }));
  }

  function handleBack() {
    setError(null);
    if (step === 0) {
      router.back();
    } else {
      setStep(step - 1);
    }
  }

  async function handleNext() {
    setError(null);
    if (step === 0 && !passage.trim()) {
      setError('Please choose the passage you read.');
      return;
    }
    if (!isLastStep) {
      setStep(step + 1);
      return;
    }
    setSaving(true);
    const message = await createCheckin({
      userId,
      readingDate,
      passage,
      readText: text.read,
      reflectText: text.reflect,
      respondText: text.respond,
      planId: planToday?.plan.id,
      planDay: planToday?.day.day,
    });
    if (message) {
      setSaving(false);
      setError(message);
      return;
    }
    // The check-in is saved; now move the plan to the next day. If this fails
    // (e.g. no signal), the Plans screen finishes it the next time it opens.
    let planMessage: string | undefined;
    if (planToday) {
      const { plan, day } = planToday;
      const row = await completePlanDay(plan.id, day.day);
      if (row?.status === 'completed') {
        planMessage = `You finished ${plan.title}! 🎉`;
      } else if (row && row.current_day > day.day) {
        planMessage = `Day ${day.day} of ${plan.durationDays} done in ${plan.title}.`;
      }
    }
    setSaving(false);
    onSaved(planMessage);
  }

  return (
    <Screen>
      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <View key={s.title} style={[styles.progressBar, i <= step && styles.progressBarDone]} />
        ))}
      </View>
      <AppText variant="caption">
        Step {step + 1} of {STEPS.length} · {dayLabel}
      </AppText>

      <AppText variant="title">{current.title}</AppText>
      <AppText>{planToday && step === 0 ? 'Today’s reading from your plan.' : current.intro}</AppText>

      {step === 0 && planToday && (
        <Card highlight>
          <AppText variant="caption">
            {planToday.plan.title} · Day {planToday.day.day} of {planToday.plan.durationDays}
          </AppText>
          <AppText variant="heading">{planToday.day.passage}</AppText>
          <AppText style={styles.dayTitle}>{planToday.day.title}</AppText>
          <AppText variant="caption">{planToday.day.summary}</AppText>
          <Button title="Read it here" variant="secondary" onPress={() => setReading(true)} />
        </Card>
      )}
      {step === 0 && !planToday && <PassagePicker label="Passage" value={passage} onChange={setPassage} />}

      {prompts.map((prompt) => (
        <Card key={prompt}>
          <AppText variant="heading">{prompt}</AppText>
        </Card>
      ))}

      {step !== REVIEW_STEP && (
        <Card highlight>
          <AppText>📓 Write your answer in your notebook. Writing by hand helps it stay with you.</AppText>
        </Card>
      )}

      {step === REVIEW_STEP && (
        <>
          <NotebookScanButtons onScanned={handleScanned} />
          <TextField
            label="Read"
            value={text.read}
            onChangeText={(value) => updatePart('read', value)}
            multiline
            maxLength={5000}
            style={styles.noteInput}
          />
          <TextField
            label="Reflect"
            value={text.reflect}
            onChangeText={(value) => updatePart('reflect', value)}
            multiline
            maxLength={5000}
            style={styles.noteInput}
          />
          <TextField
            label="Respond"
            value={text.respond}
            onChangeText={(value) => updatePart('respond', value)}
            multiline
            maxLength={5000}
            style={styles.noteInput}
          />
        </>
      )}

      {error && <AppText style={styles.error}>{error}</AppText>}

      <Button
        title={isLastStep ? 'Finish check-in' : 'Next'}
        onPress={handleNext}
        loading={saving}
      />
      <Button title={step === 0 ? 'Cancel' : 'Back'} variant="secondary" onPress={handleBack} />

      {planToday && (
        <PassageSheet
          visible={reading}
          readings={planToday.day.readings}
          title={planToday.day.passage}
          onClose={() => setReading(false)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.border,
  },
  progressBarDone: {
    backgroundColor: Colors.primary,
  },
  dayTitle: {
    fontFamily: Fonts.semiBold,
  },
  noteInput: {
    minHeight: 100,
    paddingTop: Spacing.md,
    textAlignVertical: 'top',
  },
  error: {
    color: Colors.primary,
  },
});
