import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { registerPushToken, setUpNotificationHandler, syncDailyReminder } from '@/lib/notifications';
import { SessionProvider, useSession } from '@/lib/session';

// Keep the splash screen up until fonts and the saved session have loaded,
// so the app never flashes the wrong font or the sign-in screen by mistake.
SplashScreen.preventAutoHideAsync();
setUpNotificationHandler();

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}

function RootNavigator() {
  const { session, isLoading, profile } = useSession();
  const userId = profile?.id;
  const reminderTime = profile?.reminder_time ?? null;

  // When someone signs in (or opens the app), make this phone's daily reminder
  // match their profile, and refresh the push token for encouragement alerts.
  useEffect(() => {
    if (!userId) return;
    syncDailyReminder(reminderTime);
    registerPushToken(userId);
  }, [userId, reminderTime]);

  // useFonts is a hook: it loads the fonts and re-renders this component
  // when loading finishes, which flips `fontsLoaded` to true.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fonts that fail to load fall back to the system font rather than blocking the app.
  const ready = (fontsLoaded || fontError !== null) && !isLoading;

  // useEffect runs after a render. Here it hides the splash screen once we're ready.
  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  // Tapping a notification opens the screen it points to (data.url), e.g. /friends.
  // Only once the screens exist and someone is signed in.
  const canNavigate = ready && session !== null;
  useEffect(() => {
    if (!canNavigate) return;
    function open(response: Notifications.NotificationResponse | null) {
      const url = response?.notification.request.content.data?.url;
      if (typeof url !== 'string') return;
      router.push(url as never);
      // So the same tap isn't handled again next time.
      Notifications.clearLastNotificationResponseAsync();
    }
    // The tap that opened the app, if it was closed…
    Notifications.getLastNotificationResponseAsync().then(open);
    // …and taps while it's running.
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [canNavigate]);

  if (!ready) {
    return null;
  }

  const isSignedIn = session !== null;

  // Stack.Protected only allows its screens when `guard` is true. When the
  // session changes (sign in / sign out), Expo Router moves to whichever group
  // is now allowed, so screens never need to navigate there themselves.
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}>
        {/* redirectTo says where to go when a guard says no. Without it the router
            falls back to "/", which is hidden when signed out: "Unmatched route". */}
        <Stack.Protected guard={isSignedIn} redirectTo="/sign-in">
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="check-in" />
          <Stack.Screen name="leader/[id]" />
          <Stack.Screen name="plans/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn} redirectTo="/">
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
