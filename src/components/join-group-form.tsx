import { useState } from 'react';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { Colors } from '@/constants/theme';
import { joinGroup } from '@/lib/groups';

type JoinGroupFormProps = {
  /** Called after joining, so the screen can reload its groups. */
  onJoined: () => void;
};

/** A code field and button for joining a small group. */
export function JoinGroupForm({ onJoined }: JoinGroupFormProps) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (!code.trim()) {
      setError('Please enter the code from your overseer.');
      return;
    }
    setJoining(true);
    setError(null);
    const message = await joinGroup(code);
    setJoining(false);
    if (message) {
      setError(message);
    } else {
      setCode('');
      onJoined();
    }
  }

  return (
    <>
      <TextField
        label="Group code"
        placeholder="e.g. K7QM4R2X"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={12}
        onSubmitEditing={handleJoin}
      />
      {error && <AppText style={{ color: Colors.primary }}>{error}</AppText>}
      <Button title="Join group" onPress={handleJoin} loading={joining} />
    </>
  );
}
