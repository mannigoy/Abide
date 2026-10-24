import { useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { createInviteCode, getMyActiveInviteCodes, type InviteCode } from '@/lib/invite-codes';
import { getMyLeaders, type LeaderSummary } from '@/lib/profiles';
import { useSession } from '@/lib/session';

export default function LeadersScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  // undefined = still loading, null = failed to load
  const [leaders, setLeaders] = useState<LeaderSummary[] | null | undefined>(undefined);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [creating, setCreating] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    getMyLeaders(userId).then((result) => {
      if (!ignore) setLeaders(result);
    });
    getMyActiveInviteCodes(userId).then((result) => {
      if (!ignore) setCodes(result ?? []);
    });
    return () => {
      ignore = true;
    };
  }, [userId]);

  async function handleCreateCode() {
    if (!userId) return;
    setCreating(true);
    setCodeError(null);
    const code = await createInviteCode(userId);
    setCreating(false);
    if (!code) {
      setCodeError('Couldn’t create a code. Check your connection and try again.');
      return;
    }
    setCodes((current) => [...current, code]);
    shareCode(code.code);
  }

  return (
    <Screen>
      <AppText variant="title">Leaders</AppText>

      {leaders === undefined && <AppText variant="caption">Loading…</AppText>}
      {leaders === null && (
        <AppText variant="caption">Couldn’t load your leaders. Check your connection.</AppText>
      )}
      {leaders?.length === 0 && (
        <AppText variant="caption">
          No leaders yet. Invite someone below, and they’ll appear here once they sign up.
        </AppText>
      )}
      {leaders?.map((leader) => (
        <Card key={leader.id}>
          <AppText variant="heading">{leader.full_name}</AppText>
        </Card>
      ))}

      <View style={styles.section}>
        <AppText variant="heading">Invite a leader</AppText>
        <AppText variant="caption">
          Each code works for one person and lasts 30 days. Whoever signs up with it joins your
          leaders.
        </AppText>
      </View>

      {codes.map((code) => (
        <Card key={code.code}>
          <View style={styles.codeRow}>
            <View style={styles.codeText}>
              <AppText style={styles.code}>{code.code}</AppText>
              <AppText variant="caption">
                Expires {new Date(code.expires_at).toLocaleDateString()}
              </AppText>
            </View>
            <Button title="Share" variant="secondary" onPress={() => shareCode(code.code)} />
          </View>
        </Card>
      ))}

      {codeError && <AppText style={styles.error}>{codeError}</AppText>}
      <Button title="Create invite code" onPress={handleCreateCode} loading={creating} />
    </Screen>
  );
}

/** Opens the phone's share sheet (Messenger, SMS, …) with the code in a ready-made message. */
function shareCode(code: string) {
  Share.share({
    message: `Join me on Abide for daily Bible reading! When you sign up, use this invite code: ${code}`,
  });
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  codeText: {
    flex: 1,
  },
  code: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    letterSpacing: 2,
    color: Colors.primary,
  },
  error: {
    color: Colors.primary,
  },
});
