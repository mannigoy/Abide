import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { AppText } from '@/components/app-text';
import { Sheet } from '@/components/sheet';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { encourage, ENCOURAGEMENTS, removeFriend, type EncouragementKind, type Friend } from '@/lib/friends';

type EncourageSheetProps = {
  friend: Friend | null;
  onClose: () => void;
  /** Called after unfriending, so the list can reload. */
  onRemoved: () => void;
};

/** Tap a friend: send them one kind message (once a day), or unfriend. */
export function EncourageSheet({ friend, onClose, onRemoved }: EncourageSheetProps) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function close() {
    setResult(null);
    onClose();
  }

  async function send(kind: EncouragementKind) {
    if (!friend) return;
    setSending(true);
    const error = await encourage(friend.id, kind);
    setSending(false);
    setResult(error ? { ok: false, message: error } : { ok: true, message: `Sent to ${friend.name}. 💛` });
  }

  function confirmRemove() {
    if (!friend) return;
    // Alert.alert shows the phone's own pop-up with buttons.
    Alert.alert(`Remove ${friend.name}?`, 'You’ll stop seeing each other’s reading.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const error = await removeFriend(friend.id);
          if (error) {
            setResult({ ok: false, message: error });
          } else {
            close();
            onRemoved();
          }
        },
      },
    ]);
  }

  return (
    <Sheet visible={friend !== null} onClose={close} title={friend?.name ?? ''}>
      {friend && (
        <>
          <AppText variant="caption">
            {friend.readToday ? '✓ Read today' : 'Not yet today'}
            {friend.streak > 0 ? ` · 🔥 ${friend.streak} ${friend.streak === 1 ? 'day' : 'days'} in a row` : ''}
          </AppText>

          {result?.ok ? (
            <AppText style={styles.sent}>{result.message}</AppText>
          ) : (
            <>
              <AppText>Send {friend.name} a word of encouragement:</AppText>
              {(Object.keys(ENCOURAGEMENTS) as EncouragementKind[]).map((kind) => (
                <Pressable
                  key={kind}
                  style={({ pressed }) => [styles.option, (pressed || sending) && styles.pressed]}
                  onPress={() => send(kind)}
                  disabled={sending}
                  accessibilityRole="button">
                  <Text style={styles.optionText}>{ENCOURAGEMENTS[kind]}</Text>
                </Pressable>
              ))}
              {result && <AppText style={styles.error}>{result.message}</AppText>}
            </>
          )}

          <Pressable onPress={confirmRemove} style={styles.remove} accessibilityRole="button">
            <AppText variant="caption">Remove friend</AppText>
          </Pressable>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  option: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pressed: {
    opacity: 0.6,
  },
  optionText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.text,
  },
  sent: {
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
  },
  error: {
    color: Colors.primary,
  },
  remove: {
    alignSelf: 'center',
    padding: Spacing.sm,
  },
});
