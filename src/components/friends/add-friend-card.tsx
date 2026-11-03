import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { TextField } from '@/components/text-field';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { addFriend } from '@/lib/friends';

type AddFriendCardProps = {
  /** Your own code, or null while it loads. */
  myCode: string | null;
  /** Called after a request is sent or accepted, so the list can reload. */
  onAdded: () => void;
};

/** Share your friend code, or type in a friend's code. */
export function AddFriendCard({ myCode, onAdded }: AddFriendCardProps) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleAdd() {
    if (!code.trim()) {
      setResult({ ok: false, message: 'Please type your friend’s code.' });
      return;
    }
    setBusy(true);
    const outcome = await addFriend(code);
    setBusy(false);
    setResult(outcome);
    if (outcome.ok) {
      setCode('');
      onAdded();
    }
  }

  function shareCode() {
    if (!myCode) return;
    // Opens the phone's share menu (Messenger, SMS, …).
    Share.share({
      message: `Let’s encourage each other in our Bible reading! Add me as a friend on Abide with my code: ${myCode}`,
    });
  }

  return (
    <Card>
      <AppText variant="heading">Add a friend</AppText>
      <AppText variant="caption">Your friend code</AppText>
      <Text style={styles.code} selectable>
        {myCode ?? '…'}
      </Text>
      <Button title="Share my code" variant="secondary" onPress={shareCode} disabled={!myCode} />

      <View style={styles.divider} />

      <TextField
        label="Friend’s code"
        placeholder="e.g. K7QM4XRT"
        value={code}
        onChangeText={(text) => setCode(text.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={12}
        onSubmitEditing={handleAdd}
      />
      {result && <AppText style={result.ok ? styles.ok : styles.error}>{result.message}</AppText>}
      <Button title="Add friend" onPress={handleAdd} loading={busy} />
    </Card>
  );
}

const styles = StyleSheet.create({
  code: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    letterSpacing: 4,
    color: Colors.primary,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
    backgroundColor: Colors.border,
  },
  ok: {
    fontFamily: Fonts.medium,
    color: Colors.primary,
  },
  error: {
    color: Colors.primary,
  },
});
