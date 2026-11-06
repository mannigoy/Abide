import { useState } from 'react';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { PassagePicker } from '@/components/passage-picker';
import { Colors } from '@/constants/theme';
import { saveCheckin } from '@/lib/checkins';

type SimpleCheckinFormProps = {
  userId: string;
  /** 'YYYY-MM-DD' in Manila time: today or yesterday. */
  readingDate: string;
  buttonTitle: string;
  /** Called once the check-in is saved. `queued` = no internet, waiting on the phone. */
  onSaved: (queued: boolean) => void;
};

/** Simple mode: an optional passage and one button. Used on Home and for yesterday's check-in. */
export function SimpleCheckinForm({ userId, readingDate, buttonTitle, onSaved }: SimpleCheckinFormProps) {
  const [passage, setPassage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckIn() {
    setSaving(true);
    setError(null);
    const result = await saveCheckin({ userId, readingDate, passage });
    setSaving(false);
    if (result.status === 'error') {
      setError(result.message);
    } else {
      onSaved(result.status === 'queued');
    }
  }

  return (
    <>
      <PassagePicker label="What did you read? (optional)" value={passage} onChange={setPassage} optional />
      {error && <AppText style={{ color: Colors.primary }}>{error}</AppText>}
      <Button title={buttonTitle} onPress={handleCheckIn} loading={saving} />
    </>
  );
}
