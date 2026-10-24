import { NativeTabs } from 'expo-router/native-tabs';

import { Colors, Fonts } from '@/constants/theme';

/**
 * The leader tab bar. Each `name` matches a file in `src/app/`
 * (`index` is Home). `md` icons are Material Symbols for Android and
 * `sf` icons are SF Symbols for iOS.
 *
 * Overseers get different tabs; that comes in Phase 2, once we know a user's role.
 */
export default function AppTabs() {
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
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="home" sf="house.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="bible">
        <NativeTabs.Trigger.Label>Bible</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="menu_book" sf="book.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chats">
        <NativeTabs.Trigger.Label>Chats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="chat" sf="bubble.left.and.bubble.right.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="heroes">
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
