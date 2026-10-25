import { createClient } from '@supabase/supabase-js';

// The same generated types as the phone app, so both stay in sync with the database.
import type { Database } from '../../../src/lib/database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !publishableKey) {
  throw new Error('Missing Supabase env vars. Copy admin/.env.example to admin/.env.local and fill it in.');
}

// In the browser, Supabase keeps the session in localStorage by default.
export const supabase = createClient<Database>(url, publishableKey);
