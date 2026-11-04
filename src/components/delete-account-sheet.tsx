import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Colors, Spacing } from '@/constants/theme';
import { deleteMyAccount } from '@/lib/auth';

type DeleteAccountSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Asks "are you sure?" before deleting the account for good. After it works,
 * the session provider sees the sign-out and the app goes back to sign-in,
 * so there's nothing more to do here.
 */
export function DeleteAccountSheet({ visible, onClose }: DeleteAccountSheetProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (deleting) return;
    setError(null);
    onClose();
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const result = await deleteMyAccount();
    setDeleting(false);
    if (result) setError(result);
  }

  return (
    <Sheet visible={visible} onClose={close} title="Delete my account">
      <AppText>
        We’re sorry to see you go. Thank you for every day you spent in God’s Word with us.
      </AppText>
      <View style={styles.list}>
        <AppText variant="caption">Deleting your account removes, for good:</AppText>
        <AppText variant="caption">• your profile, name and email</AppText>
        <AppText variant="caption">• your check-ins, streak and Read, Reflect, Respond notes</AppText>
        <AppText variant="caption">• your highlights, reading plans, friends and encouragements</AppText>
        <AppText variant="caption">• your group memberships and any problem reports you sent</AppText>
      </View>
      <AppText variant="caption">This can’t be undone. Your notebook stays yours, of course.</AppText>
      {error && <AppText style={styles.error}>{error}</AppText>}
      <Button title="Delete my account" onPress={handleDelete} loading={deleting} />
      <Button title="Keep my account" variant="secondary" onPress={close} disabled={deleting} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.xs,
  },
  error: {
    color: Colors.primary,
  },
});
