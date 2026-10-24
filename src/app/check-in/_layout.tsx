import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

/** The check-in flow opens on top of the tabs, so the tab bar is hidden while you check in. */
export default function CheckinLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Screen name="index" />
      {/* No swiping back from the celebration into a check-in that's already saved. */}
      <Stack.Screen name="done" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
