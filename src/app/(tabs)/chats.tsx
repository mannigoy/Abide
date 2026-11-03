import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { JoinGroupForm } from '@/components/join-group-form';
import { Screen } from '@/components/screen';
import { getMyGroups } from '@/lib/groups';
import { useSession } from '@/lib/session';

export default function ChatsScreen() {
  const { profile, refreshProfile } = useSession();
  const userId = profile?.id;
  // undefined = loading. If loading fails we assume they have a group, so we don't nag.
  const [hasGroup, setHasGroup] = useState<boolean | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let ignore = false;
      getMyGroups(userId).then((groups) => {
        if (!ignore) setHasGroup(groups === null || groups.length > 0);
      });
      return () => {
        ignore = true;
      };
    }, [userId]),
  );

  function handleJoined() {
    setHasGroup(true);
    // Your first group sets your overseer, so the profile has changed too.
    refreshProfile();
  }

  return (
    <Screen>
      <AppText variant="title">Chats</AppText>

      {hasGroup === false && (
        <Card highlight>
          <AppText variant="heading">Join your small group</AppText>
          <AppText>Ask your overseer for your group’s code so they can cheer you on.</AppText>
          <JoinGroupForm onJoined={handleJoined} />
        </Card>
      )}

      <AppText variant="caption">Chat with your overseer and cell group is coming after launch.</AppText>
    </Screen>
  );
}
