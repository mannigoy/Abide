import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import {
  createGroup,
  getGroupsILead,
  groupTypeLabels,
  type GroupType,
  type LedGroup,
} from '@/lib/groups';
import { useSession } from '@/lib/session';

export default function LeadersScreen() {
  const { profile } = useSession();
  const userId = profile?.id;
  // undefined = still loading, null = failed to load
  const [groups, setGroups] = useState<LedGroup[] | null | undefined>(undefined);

  // Reload every time this tab comes back into view.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let ignore = false;
      getGroupsILead(userId).then((result) => {
        if (!ignore) setGroups(result);
      });
      return () => {
        ignore = true;
      };
    }, [userId]),
  );

  function handleCreated() {
    if (userId) getGroupsILead(userId).then(setGroups);
  }

  return (
    <Screen>
      <AppText variant="title">Leaders</AppText>
      <AppText variant="caption">
        Share a group’s code with its members. Anyone who joins with it appears here.
      </AppText>

      {groups === undefined && <AppText variant="caption">Loading…</AppText>}
      {groups === null && (
        <AppText variant="caption">Couldn’t load your groups. Check your connection.</AppText>
      )}
      {groups?.length === 0 && (
        <AppText variant="caption">You don’t lead any groups yet. Create one below.</AppText>
      )}
      {groups?.map((group) => <GroupCard key={group.id} group={group} />)}

      {userId && (
        <CreateGroupForm userId={userId} onCreated={handleCreated} />
      )}
    </Screen>
  );
}

function GroupCard({ group }: { group: LedGroup }) {
  return (
    <Card>
      <AppText variant="heading">{group.name}</AppText>
      <AppText variant="caption">
        {groupTypeLabels[group.type]} · {group.members.length}{' '}
        {group.members.length === 1 ? 'member' : 'members'}
      </AppText>

      {group.members.map((member) => (
        <AppText key={member.id}>{member.full_name}</AppText>
      ))}

      <View style={styles.codeRow}>
        <View style={styles.codeText}>
          <AppText variant="caption">Group code</AppText>
          <AppText style={styles.code}>{group.join_code}</AppText>
        </View>
        <Button title="Share" variant="secondary" onPress={() => shareGroup(group)} />
      </View>
    </Card>
  );
}

type CreateGroupFormProps = {
  userId: string;
  onCreated: () => void;
};

function CreateGroupForm({ userId, onCreated }: CreateGroupFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<GroupType>('cell_group');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) {
      setError('Please give the group a name.');
      return;
    }
    setCreating(true);
    setError(null);
    const message = await createGroup(userId, name, type);
    setCreating(false);
    if (message) {
      setError(message);
    } else {
      setName('');
      onCreated();
    }
  }

  return (
    <>
      <View style={styles.section}>
        <AppText variant="heading">Create a group</AppText>
      </View>
      <TextField
        label="Group name"
        placeholder="e.g. Lahug Youth Cell"
        value={name}
        onChangeText={setName}
        maxLength={60}
        autoCapitalize="words"
      />
      <View style={styles.typeRow}>
        {(Object.keys(groupTypeLabels) as GroupType[]).map((option) => (
          <Pressable
            key={option}
            onPress={() => setType(option)}
            accessibilityRole="radio"
            accessibilityState={{ selected: type === option }}
            style={[styles.typeOption, type === option && styles.typeOptionSelected]}>
            <AppText style={type === option ? styles.typeLabelSelected : undefined}>
              {groupTypeLabels[option]}
            </AppText>
          </Pressable>
        ))}
      </View>
      {error && <AppText style={styles.error}>{error}</AppText>}
      <Button title="Create group" onPress={handleCreate} loading={creating} />
    </>
  );
}

/** Opens the phone's share sheet (Messenger, SMS, …) with the code in a ready-made message. */
function shareGroup(group: LedGroup) {
  Share.share({
    message:
      `Join our small group "${group.name}" on Abide for daily Bible reading! ` +
      `After you sign up, go to Profile → Join a group and enter this code: ${group.join_code}`,
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
    marginTop: Spacing.sm,
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
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  typeLabelSelected: {
    color: Colors.primary,
    fontFamily: Fonts.semiBold,
  },
  error: {
    color: Colors.primary,
  },
});
