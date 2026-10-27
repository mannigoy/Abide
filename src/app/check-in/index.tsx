import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { NotebookScanButtons } from '@/components/notebook-scan-buttons';
import { Screen } from '@/components/screen';
import { SimpleCheckinForm } from '@/components/simple-checkin-form';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { createCheckin } from '@/lib/checkins';
import { isCheckinDateAllowed, manilaDate } from '@/lib/dates';
import type { RrrText } from '@/lib/rrr-text';
import { useSession } from '@/lib/session';

/**
 * Check-in for today, or yesterday via `/check-in?date=YYYY-MM-DD`.
 * Guided leaders get the three RRR steps; Simple leaders get the one-tap form.
 */
export default function CheckinScreen() {
  const { profile } = useSession();
  // useLocalSearchParams reads values from the URL, like ?date=2026-10-23.
  const params = useLocalSearchParams<{ date?: string }>();
  const readingDate =
    params.date && isCheckinDateAllowed(params.date) ? params.date : manilaDate(0);
  const dayLabel = readingDate === manilaDate(0) ? 'today' : 'yesterday';

  if (!profile) return null;

  // router.replace swaps this screen for the celebration, so "back" goes home, not here.
  const goToDone = () => router.replace('/check-in/done');

  if (profile.mode === 'guided') {
    return <GuidedCheckin userId={profile.id} readingDate={readingDate} dayLabel={dayLabel} onSaved={goToDone} />;
  }

  return (
    <Screen>
      <AppText variant="title">Check in for {dayLabel}</AppText>
      <Card highlight>
        <SimpleCheckinForm
          userId={profile.id}
          readingDate={readingDate}
          buttonTitle={`I did my RRR ${dayLabel}`}
          onSaved={goToDone}
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
  onSaved: () => void;
};

function GuidedCheckin({ userId, readingDate, dayLabel, onSaved }: GuidedCheckinProps) {
  const [step, setStep] = useState(0);
  const [passage, setPassage] = useState('');
  const [text, setText] = useState<RrrText>({ read: '', reflect: '', respond: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = STEPS[step];
  const isLastStep = step === REVIEW_STEP;

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
      setError('Please add the passage you read, e.g. John 3.');
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
    });
    setSaving(false);
    if (message) {
      setError(message);
    } else {
      onSaved();
    }
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
      <AppText>{current.intro}</AppText>

      {step === 0 && (
        <TextField
          label="Passage"
          placeholder="e.g. John 3"
          value={passage}
          onChangeText={setPassage}
          maxLength={100}
          autoCapitalize="words"
        />
      )}

      {current.prompts.map((prompt) => (
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
  noteInput: {
    minHeight: 100,
    paddingTop: Spacing.md,
    textAlignVertical: 'top',
  },
  error: {
    color: Colors.primary,
  },
});
