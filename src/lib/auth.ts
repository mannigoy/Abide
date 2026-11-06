import type { AuthError } from '@supabase/supabase-js';

import { forgetPendingCheckins, sendPendingCheckins } from '@/lib/checkins';
import { forgetThisPhone } from '@/lib/notifications';
import { forgetSavedProfile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

/**
 * Sign-in, sign-up and sign-out. Each function returns a friendly error
 * message to show on screen, or `null` when it worked.
 *
 * You don't need to navigate after signing in or out: the session provider
 * (src/lib/session.tsx) notices the change and the root layout switches screens.
 */

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return error ? friendlyMessage(error) : null;
}

type SignUpInput = {
  fullName: string;
  email: string;
  password: string;
};

type SignUpResult = {
  error: string | null;
  /** True when Supabase wants the person to confirm their email before signing in. */
  needsEmailConfirmation: boolean;
};

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      // Saved as user metadata; the sign-up trigger reads it to create the profile.
      data: { full_name: input.fullName.trim() },
    },
  });
  if (error) {
    return { error: friendlyMessage(error), needsEmailConfirmation: false };
  }
  return { error: null, needsEmailConfirmation: data.session === null };
}

export async function signOut(): Promise<string | null> {
  const userId = (await supabase.auth.getSession()).data.session?.user.id;
  if (userId) {
    // Try to send check-ins saved offline. Any still waiting stay on the phone
    // and are sent the next time this person signs in here.
    await sendPendingCheckins(userId);
    await forgetSavedProfile(userId);
  }
  // Stop this phone getting the person's reminders and encouragement alerts.
  await forgetThisPhone();
  const { error } = await supabase.auth.signOut();
  return error ? friendlyMessage(error) : null;
}

/**
 * Deletes the signed-in person's account and everything that belongs to it
 * (check-ins, notes, highlights, plans, friends, encouragements), then signs
 * out on this phone. Returns an error message, or `null` when it worked.
 *
 * The database function `delete_my_account` does the work and refuses while
 * the person still leads a group, because deleting them would delete the
 * whole group for everyone in it.
 */
export async function deleteMyAccount(): Promise<string | null> {
  const userId = (await supabase.auth.getSession()).data.session?.user.id;
  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    if (error.code === '55000') {
      return 'You still lead a group. Please ask an admin to move your groups to another overseer first, then try again.';
    }
    console.warn('Could not delete account', error.message);
    return 'Couldn’t delete your account. Check your connection and try again.';
  }
  // The account is gone from the server, so clear what's saved on this phone.
  if (userId) {
    await forgetPendingCheckins(userId);
    await forgetSavedProfile(userId);
  }
  await supabase.auth.signOut({ scope: 'local' });
  return null;
}

function friendlyMessage(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'That email and password don’t match. Please try again.';
    case 'email_not_confirmed':
      return 'Please confirm your email first. Check your inbox for the link.';
    case 'user_already_exists':
    case 'email_exists':
      return 'There’s already an account with that email. Try signing in instead.';
    case 'weak_password':
      return 'Please choose a longer password (at least 6 characters).';
    case 'validation_failed':
    case 'email_address_invalid':
      return 'Please check that your email address is correct.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Too many tries. Please wait a few minutes and try again.';
  }
  if (error.message.toLowerCase().includes('network')) {
    return 'Can’t reach the server. Check your internet connection.';
  }
  return 'Something went wrong. Please try again.';
}
