import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SimpleCheckinForm } from '@/components/simple-checkin-form';
import { TextField } from '@/components/text-field';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { createCheckin } from '@/lib/checkins';
import { isCheckinDateAllowed, manilaDate } from '@/lib/dates';
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

const STEPS = [
  {
    title: 'Read',
    intro: 'Which passage are you reading?',
    prompts: [] as string[],
    noteLabel: 'Anything you noted while reading? (optional)',
  },
  {
    title: 'Reflect',
    intro: 'Think about what you read.',
    prompts: ['What does this show you about God?', 'What stood out to you?'],
    noteLabel: 'A few words from your reflection (optional)',
  },
  {
    title: 'Respond',
    intro: 'Bring it into your day.',
    prompts: ['What will you do or pray about today?'],
    noteLabel: 'A few words from your response (optional)',
  },
];

type GuidedCheckinProps = {
  userId: string;
  readingDate: string;
  dayLabel: string;
  onSaved: () => void;
};

function GuidedCheckin({ userId, readingDate, dayLabel, onSaved }: GuidedCheckinProps) {
  const [step, setStep] = useState(0);
  const [passage, setPassage] = useState('');
  // One note per step, in the same order as STEPS.
  const [notes, setNotes] = useState(['', '', '']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  function updateNote(text: string) {
    // State should be replaced, not changed in place, so React notices the change.
    setNotes((previous) => previous.map((note, i) => (i === step ? text : note)));
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
      readText: notes[0],
      reflectText: notes[1],
      respondText: notes[2],
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

      <Card highlight>
        <AppText>📓 Write your answer in your notebook first. Writing by hand helps it stay with you.</AppText>
      </Card>

      <TextField
        label={current.noteLabel}
        value={notes[step]}
        onChangeText={updateNote}
        multiline
        maxLength={5000}
        style={styles.noteInput}
      />

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
