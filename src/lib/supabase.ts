// Gives React Native a browser-style `localStorage`, backed by SQLite on the
// phone. Supabase uses it to remember the signed-in session between app launches.
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Variables starting with EXPO_PUBLIC_ are copied into the app at build time.
// That means anyone with the app can read them, so only the *publishable*
// key goes here — never the service-role key or any other secret.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env.local, fill in the values, then restart `npx expo start`.',
  );
}

/** The one Supabase client for the whole app. Import it from here; don't create another. */
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Only browsers sign in by redirecting back with tokens in the URL.
    detectSessionInUrl: false,
  },
});

// Sign-in sessions expire and are refreshed in the background. On a phone we
// only refresh while the app is open, so a closed app doesn't use data or battery.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
