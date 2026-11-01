import { supabase } from '@/lib/supabase';

/** Sends a "Report a problem" message to the admins. Returns an error message, or null. */
export async function sendFeedback(userId: string, message: string): Promise<string | null> {
  const { error } = await supabase.from('feedback').insert({ user_id: userId, message: message.trim() });
  if (error) {
    console.warn('Could not send feedback', error.message);
    return 'Couldn’t send that. Check your connection and try again.';
  }
  return null;
}
