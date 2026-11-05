import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DeleteAccountSheet } from '@/components/delete-account-sheet';
import { JoinGroupForm } from '@/components/join-group-form';
import { ReminderSheet } from '@/components/reminder-sheet';
import { ReportProblemSheet } from '@/components/report-problem-sheet';
import { Screen } from '@/components/screen';
import { PRIVACY_POLICY_URL } from '@/constants/links';
import { Colors, Spacing } from '@/constants/theme';
import { signOut } from '@/lib/auth';
import { getMyGroups, groupTypeLabels, type MemberGroup } from '@/lib/groups';
import { formatTime, parseTime } from '@/lib/notifications';
import { roleLabels } from '@/lib/profiles';
import { useSession } from '@/lib/session';

export default function ProfileScreen() {
  // The profile is loaded once by the session provider, so every screen shares it.
  const { session, profile, refreshProfile } = useSession();
  const userId = profile?.id;
  // undefined = still loading, null = failed to load
  const [groups, setGroups] = useState<MemberGroup[] | null | undefined>(undefined);
  const [reporting, setReporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [choosingReminder, setChoosingReminder] = useState(false);
  const reminder = profile?.reminder_time ? parseTime(profile.reminder_time) : null;

  // Reload every time this tab comes back into view.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let ignore = false;
      getMyGroups(userId).then((result) => {
        if (!ignore) setGroups(result);
      });
      return () => {
        ignore = true;
      };
    }, [userId]),
  );

  function handleJoined() {
    if (userId) getMyGroups(userId).then(setGroups);
    // Your first group sets your overseer, so the profile has changed too.
    refreshProfile();
  }

  return (
    <Screen>
      <AppText variant="title">Profile</AppText>

      <Card>
        <AppText variant="heading">{profile?.full_name ?? 'Your profile'}</AppText>
        <AppText variant="caption">{session?.user.email}</AppText>
        {profile && <AppText variant="caption">{roleLabels[profile.role]}</AppText>}
      </Card>

      <Card>
        <AppText variant="heading">Daily reminder</AppText>
        <AppText variant="caption">
          {reminder
            ? `Every day at ${formatTime(reminder.hour, reminder.minute)}. Friends’ encouragements will notify you too.`
            : 'Off. A gentle nudge each day helps the habit stick.'}
        </AppText>
        <Button
          title={reminder ? 'Change time' : 'Set a reminder'}
          variant="secondary"
          onPress={() => setChoosingReminder(true)}
        />
      </Card>

      <View style={styles.section}>
        <AppText variant="heading">My groups</AppText>
        {groups === null && (
          <AppText variant="caption">Couldn’t load your groups. Check your connection.</AppText>
        )}
        {groups?.length === 0 && (
          <AppText variant="caption">You haven’t joined a small group yet.</AppText>
        )}
      </View>
      {groups?.map((group) => (
        <Card key={group.id}>
          <AppText variant="heading">{group.name}</AppText>
          <AppText variant="caption">{groupTypeLabels[group.type]}</AppText>
        </Card>
      ))}

      <View style={styles.section}>
        <AppText variant="heading">Join a group</AppText>
        <AppText variant="caption">Ask your overseer for your group’s code.</AppText>
      </View>
      <JoinGroupForm onJoined={handleJoined} />

      <View style={styles.section}>
        <Button title="Report a problem" variant="secondary" onPress={() => setReporting(true)} />
        <Button title="Sign out" variant="secondary" onPress={() => signOut()} />
      </View>

      <View style={styles.quietLinks}>
        <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} accessibilityRole="link" hitSlop={8}>
          <AppText variant="caption" style={styles.link}>
            Privacy policy
          </AppText>
        </Pressable>
        <Pressable onPress={() => setDeleting(true)} accessibilityRole="button" hitSlop={8}>
          <AppText variant="caption" style={styles.link}>
            Delete my account
          </AppText>
        </Pressable>
      </View>

      {userId && <ReportProblemSheet visible={reporting} userId={userId} onClose={() => setReporting(false)} />}
      <DeleteAccountSheet visible={deleting} onClose={() => setDeleting(false)} />
      {userId && (
        <ReminderSheet
          visible={choosingReminder}
          userId={userId}
          current={profile?.reminder_time ?? null}
          onClose={() => setChoosingReminder(false)}
          onSaved={refreshProfile}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
  quietLinks: {
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  link: {
    color: Colors.primary,
  },
});
