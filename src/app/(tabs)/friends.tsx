import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { AddFriendCard } from '@/components/friends/add-friend-card';
import { EncourageSheet } from '@/components/friends/encourage-sheet';
import { FriendRow } from '@/components/friends/friend-row';
import { Screen } from '@/components/screen';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import {
  answerRequest,
  ENCOURAGEMENTS,
  getEncouragements,
  getFriends,
  getMyFriendCode,
  markEncouragementsRead,
  removeFriend,
  type Encouragement,
  type Friend,
} from '@/lib/friends';
import { useSession } from '@/lib/session';

type Loaded = { friends: Friend[] | null; received: Encouragement[]; myCode: string | null };

/** Everything the tab shows. Marks new encouragements as seen (they still show as new this time). */
async function loadFriends(userId: string): Promise<Loaded> {
  const [friends, received, myCode] = await Promise.all([getFriends(), getEncouragements(), getMyFriendCode(userId)]);
  if (received?.some((e) => !e.read)) markEncouragementsRead();
  return { friends, received: received ?? [], myCode };
}

export default function FriendsScreen() {
  const { profile } = useSession();
  const userId = profile?.id;
  // undefined = still loading
  const [loaded, setLoaded] = useState<Loaded | undefined>(undefined);
  const [selected, setSelected] = useState<Friend | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reload whenever the tab comes into view…
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let ignore = false;
      loadFriends(userId).then((result) => {
        if (!ignore) setLoaded(result);
      });
      return () => {
        ignore = true;
      };
    }, [userId]),
  );
  // …and after something changes here (accepting, adding, removing).
  function reload() {
    if (userId) loadFriends(userId).then(setLoaded);
  }

  async function respond(friend: Friend, accept: boolean) {
    setError(await answerRequest(friend.id, accept));
    reload();
  }

  async function cancelRequest(friend: Friend) {
    setError(await removeFriend(friend.id));
    reload();
  }

  const friends = loaded?.friends ?? [];
  const incoming = friends.filter((f) => f.relation === 'incoming');
  const outgoing = friends.filter((f) => f.relation === 'outgoing');
  // Friends who haven't read yet come first, so it's easy to encourage them.
  const accepted = friends
    .filter((f) => f.relation === 'friend')
    .sort((a, b) => Number(a.readToday) - Number(b.readToday));
  const readCount = accepted.filter((f) => f.readToday).length;

  return (
    <Screen>
      <AppText variant="title">Friends</AppText>
      <AppText variant="caption">Cheer each other on in God’s word.</AppText>

      {loaded === undefined && <AppText variant="caption">Loading…</AppText>}
      {loaded?.friends === null && (
        <AppText variant="caption">Couldn’t load your friends. Check your connection.</AppText>
      )}
      {error && <AppText style={styles.error}>{error}</AppText>}

      {loaded && loaded.received.length > 0 && (
        <Section title="For you">
          {loaded.received.map((e) => (
            <Card key={e.id} highlight={!e.read}>
              <AppText>
                <Text style={styles.bold}>{e.from}</Text>: {ENCOURAGEMENTS[e.kind]}
              </AppText>
            </Card>
          ))}
        </Section>
      )}

      {incoming.length > 0 && (
        <Section title="Friend requests">
          {incoming.map((friend) => (
            <FriendRow
              key={friend.id}
              name={friend.name}
              detail="Wants to be friends"
              actions={
                <View style={styles.actions}>
                  <Button title="Accept" onPress={() => respond(friend, true)} />
                  <Button title="No" variant="secondary" onPress={() => respond(friend, false)} />
                </View>
              }
            />
          ))}
        </Section>
      )}

      {accepted.length > 0 && (
        <Section title={`Today · ${readCount} of ${accepted.length} have read`}>
          {accepted.map((friend) => (
            <FriendRow
              key={friend.id}
              name={friend.name}
              good={friend.readToday}
              detail={`${friend.readToday ? '✓ Read today' : 'Not yet today'}${friend.streak > 0 ? ` · 🔥 ${friend.streak}` : ''}`}
              onPress={() => setSelected(friend)}
            />
          ))}
        </Section>
      )}

      {loaded && accepted.length === 0 && incoming.length === 0 && (
        <Card>
          <AppText variant="heading">Read together 💛</AppText>
          <AppText>Add friends to see when they’ve read and send them a kind word.</AppText>
        </Card>
      )}

      {outgoing.length > 0 && (
        <Section title="Waiting for them to accept">
          {outgoing.map((friend) => (
            <FriendRow
              key={friend.id}
              name={friend.name}
              detail="Request sent"
              actions={<Button title="Cancel" variant="secondary" onPress={() => cancelRequest(friend)} />}
            />
          ))}
        </Section>
      )}

      {loaded && <AddFriendCard myCode={loaded.myCode} onAdded={reload} />}

      <EncourageSheet friend={selected} onClose={() => setSelected(null)} onRemoved={reload} />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.9,
    color: Colors.textSecondary,
  },
  actions: {
    gap: Spacing.xs,
  },
  bold: {
    fontFamily: Fonts.semiBold,
  },
  error: {
    color: Colors.primary,
  },
});
