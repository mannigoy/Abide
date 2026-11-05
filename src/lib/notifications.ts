import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

/**
 * Notifications (Phase 8).
 *
 * - Daily reading reminder: a *local* notification. The phone schedules it
 *   itself, so it works offline and needs no server.
 * - Encouragement alerts: *push* notifications. The phone registers a push
 *   token with Expo and saves it to profiles.push_token; when a friend sends
 *   an encouragement, the database asks Expo to deliver it (see the
 *   push_notifications migration).
 */

const REMINDER_ID = 'daily-reminder';

// Android groups notifications into "channels" the user can turn on or off in
// the phone's settings. The ids must match what the server sends.
const CHANNELS = {
  reminders: { name: 'Daily reminder', importance: AndroidImportance.DEFAULT },
  encouragements: { name: 'Encouragements from friends', importance: AndroidImportance.HIGH },
} as const;

/** Show notifications even while the app is open. Call once when the app starts. */
export function setUpNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** On Android 13+ the permission prompt only appears once a channel exists, so create them first. */
async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  for (const [id, channel] of Object.entries(CHANNELS)) {
    await Notifications.setNotificationChannelAsync(id, { ...channel, lightColor: Colors.primary });
  }
}

/** True if the user has allowed notifications. Never shows a prompt. */
export async function hasNotificationPermission(): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

/** Asks for permission if needed (shows the phone's prompt). Returns true if allowed. */
export async function askNotificationPermission(): Promise<boolean> {
  await ensureChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false; // they said "Don't allow"; only phone settings can change it now
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

// ---------------------------------------------------------------------------
// Daily reminder
// ---------------------------------------------------------------------------

/** '06:30:00' (as Postgres stores a time) → { hour: 6, minute: 30 } */
export function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

/** { hour: 6, minute: 30 } → '6:30 AM' */
export function formatTime(hour: number, minute: number): string {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/**
 * Makes this phone's reminder match `time` ('HH:MM:SS'), or removes it when
 * `time` is null. Safe to call every time the app opens. Does nothing (and
 * never prompts) if notifications aren't allowed.
 */
export async function syncDailyReminder(time: string | null): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  if (!time || !(await hasNotificationPermission())) return;
  await ensureChannels();
  const { hour, minute } = parseTime(time);
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: 'Time with God 📖',
      body: 'Your daily RRR is waiting. Read, reflect, respond, then check in.',
      data: { url: '/' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'reminders' },
  });
}

/**
 * Saves the reminder time on the profile (so it follows the user to a new
 * phone) and schedules it here. `time` null turns the reminder off.
 * Returns an error message, or null when it worked.
 */
export async function setReminderTime(userId: string, time: string | null): Promise<string | null> {
  if (time && !(await askNotificationPermission())) {
    return 'Notifications are turned off for Abide. Turn them on in your phone’s Settings, then try again.';
  }
  const { error } = await supabase.from('profiles').update({ reminder_time: time }).eq('id', userId);
  if (error) {
    console.warn('Could not save reminder time', error.message);
    return 'Couldn’t save your reminder. Check your connection and try again.';
  }
  await syncDailyReminder(time);
  // Allowing notifications for reminders also turns on encouragement alerts.
  if (time) await registerPushToken(userId);
  return null;
}

// ---------------------------------------------------------------------------
// Push token (for encouragements)
// ---------------------------------------------------------------------------

/**
 * Saves this phone's push token to the profile, if notifications are allowed.
 * Never prompts. Push doesn't work in Expo Go on Android, so it's skipped there.
 */
export async function registerPushToken(userId: string): Promise<void> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
  if (!(await hasNotificationPermission())) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;
  try {
    await ensureChannels();
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
    if (error) console.warn('Could not save push token', error.message);
  } catch (error) {
    // No internet, or push isn't set up yet (Firebase): reminders still work.
    console.warn('Could not get push token', error);
  }
}

/** Call before signing out, so this phone stops getting that person's notifications. */
export async function forgetThisPhone(userId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  await supabase.from('profiles').update({ push_token: null }).eq('id', userId);
}
