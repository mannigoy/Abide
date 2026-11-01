import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { TextField } from '@/components/text-field';
import { Colors, Spacing } from '@/constants/theme';
import { sendFeedback } from '@/lib/feedback';

type ReportProblemSheetProps = {
  visible: boolean;
  userId: string;
  onClose: () => void;
};

export function ReportProblemSheet({ visible, userId, onClose }: ReportProblemSheetProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function close() {
    setMessage('');
    setError(null);
    setSent(false);
    onClose();
  }

  async function handleSend() {
    if (!message.trim()) {
      setError('Please tell us what happened.');
      return;
    }
    setSending(true);
    setError(null);
    const result = await sendFeedback(userId, message);
    setSending(false);
    if (result) {
      setError(result);
    } else {
      setSent(true);
    }
  }

  return (
    <Sheet visible={visible} onClose={close} title="Report a problem">
      {sent ? (
        <>
          <AppText>Thank you! The Abide team will take a look. 🙏</AppText>
          <Button title="Done" onPress={close} />
        </>
      ) : (
        <>
          <AppText variant="caption">
            What went wrong, or what could be better? Your name is sent with it so we can follow up.
          </AppText>
          <TextField
            label="Message"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={2000}
            style={styles.input}
          />
          {error && <AppText style={styles.error}>{error}</AppText>}
          <Button title="Send" onPress={handleSend} loading={sending} />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 120,
    paddingTop: Spacing.md,
    textAlignVertical: 'top',
  },
  error: {
    color: Colors.primary,
  },
});
