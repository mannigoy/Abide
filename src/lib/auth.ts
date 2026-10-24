import type { AuthError, PostgrestError } from '@supabase/supabase-js';

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
  inviteCode: string;
};

type SignUpResult = {
  error: string | null;
  /** True when Supabase wants the person to confirm their email before signing in. */
  needsEmailConfirmation: boolean;
};

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const inviteCode = input.inviteCode.trim().toUpperCase();

  // Check the code first so we can give a clear message. The database checks
  // it again during sign-up (see the handle_new_user trigger), so this can't be skipped.
  const { data: codeIsValid, error: codeError } = await supabase.rpc('is_invite_code_valid', {
    p_code: inviteCode,
  });
  if (codeError) {
    return { error: friendlyMessage(codeError), needsEmailConfirmation: false };
  }
  if (!codeIsValid) {
    return {
      error: 'That invite code isn’t valid or has expired. Ask your overseer for a new one.',
      needsEmailConfirmation: false,
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      // Saved as user metadata; the sign-up trigger reads these to create the profile.
      data: { full_name: input.fullName.trim(), invite_code: inviteCode },
    },
  });
  if (error) {
    return { error: friendlyMessage(error), needsEmailConfirmation: false };
  }
  return { error: null, needsEmailConfirmation: data.session === null };
}

export async function signOut(): Promise<string | null> {
  const { error } = await supabase.auth.signOut();
  return error ? friendlyMessage(error) : null;
}

function friendlyMessage(error: AuthError | PostgrestError): string {
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
    case 'unexpected_failure':
      // The sign-up trigger rejected it, e.g. the last use of a code was just taken.
      return 'We couldn’t create your account. Check your invite code and try again.';
  }
  if (error.message.toLowerCase().includes('network')) {
    return 'Can’t reach the server. Check your internet connection.';
  }
  return 'Something went wrong. Please try again.';
}
