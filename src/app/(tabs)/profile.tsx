import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { signOut } from '@/lib/auth';
import { getMyProfile, type Profile } from '@/lib/profiles';
import { useSession } from '@/lib/session';

const roleLabels: Record<Profile['role'], string> = {
  leader: 'Leader',
  overseer: 'Overseer',
  admin: 'Admin',
};

export default function ProfileScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [profile, setProfile] = useState<Profile | null>(null);

  // Load the profile when the screen opens (and again if the user changes).
  useEffect(() => {
    if (!userId) return;
    // If the screen goes away before the request finishes, `ignore` stops us
    // from saving a stale result.
    let ignore = false;
    getMyProfile(userId).then((result) => {
      if (!ignore) setProfile(result);
    });
    return () => {
      ignore = true;
    };
  }, [userId]);

  return (
    <Screen>
      <AppText variant="title">Profile</AppText>

      <View style={styles.card}>
        <AppText variant="heading">{profile?.full_name ?? '…'}</AppText>
        <AppText variant="caption">{session?.user.email}</AppText>
        {profile && <AppText variant="caption">{roleLabels[profile.role]}</AppText>}
      </View>

      <Button title="Sign out" variant="secondary" onPress={() => signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
});
