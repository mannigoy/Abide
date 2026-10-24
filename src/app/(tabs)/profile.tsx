import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { signOut } from '@/lib/auth';
import { roleLabels } from '@/lib/profiles';
import { useSession } from '@/lib/session';

export default function ProfileScreen() {
  // The profile is loaded once by the session provider, so every screen shares it.
  const { session, profile } = useSession();

  return (
    <Screen>
      <AppText variant="title">Profile</AppText>

      <Card>
        <AppText variant="heading">{profile?.full_name ?? 'Your profile'}</AppText>
        <AppText variant="caption">{session?.user.email}</AppText>
        {profile && <AppText variant="caption">{roleLabels[profile.role]}</AppText>}
      </Card>

      <Button title="Sign out" variant="secondary" onPress={() => signOut()} />
    </Screen>
  );
}
