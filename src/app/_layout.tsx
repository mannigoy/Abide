import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { SessionProvider, useSession } from '@/lib/session';

// Keep the splash screen up until fonts and the saved session have loaded,
// so the app never flashes the wrong font or the sign-in screen by mistake.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useSession();

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
        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
