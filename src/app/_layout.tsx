import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';

// Keep the splash screen up until the fonts have loaded, so the app never
// flashes text in the wrong font.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // useFonts is a hook: it loads the fonts and re-renders this component
  // when loading finishes, which flips `fontsLoaded` to true.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // useEffect runs after a render. Here it hides the splash screen once the
  // fonts are ready (or failed, so the app still opens with the system font).
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <AppTabs />
    </>
  );
}
