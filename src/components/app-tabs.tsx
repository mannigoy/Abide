import { NativeTabs } from 'expo-router/native-tabs';

import { Colors, Fonts } from '@/constants/theme';
import { usesOverseerTabs } from '@/lib/profiles';
import { useSession } from '@/lib/session';

/**
 * The tab bar. Each `name` matches a file in `src/app/(tabs)/`.
 * `md` icons are Material Symbols for Android and `sf` icons are SF Symbols for iOS.
 *
 * Leader tabs:   Home,  Bible, Chats, Heroes,  Profile
 * Overseer tabs: Today, Leaders, Bible, Chats, Profile
 *
 * The first tab (`index`) is shared: it shows Home or Today depending on the
 * role, so everyone lands on the right screen when the app opens. `hidden`
 * removes a tab completely: it can't be opened at all.
 */
export default function AppTabs() {
  const { profile } = useSession();
  const isOverseer = usesOverseerTabs(profile?.role);

  return (
    <NativeTabs
      backgroundColor={Colors.surface}
      indicatorColor={Colors.primarySoft}
      iconColor={{ default: Colors.textSecondary, selected: Colors.primary }}
      labelStyle={{
        default: { color: Colors.textSecondary, fontFamily: Fonts.medium },
        selected: { color: Colors.primary, fontFamily: Fonts.semiBold },
      }}>
      <NativeTabs.Trigger name="index">
        {isOverseer ? (
          <>
            <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon md="today" sf="sun.max.fill" />
          </>
        ) : (
          <>
            <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon md="home" sf="house.fill" />
          </>
        )}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="leaders" hidden={!isOverseer}>
        <NativeTabs.Trigger.Label>Leaders</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="groups" sf="person.3.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="bible">
        <NativeTabs.Trigger.Label>Bible</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="menu_book" sf="book.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chats">
        <NativeTabs.Trigger.Label>Chats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="chat" sf="bubble.left.and.bubble.right.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="heroes" hidden={isOverseer}>
        <NativeTabs.Trigger.Label>Heroes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="military_tech" sf="star.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="person" sf="person.crop.circle.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
