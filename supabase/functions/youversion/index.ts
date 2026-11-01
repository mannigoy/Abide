// Edge Function: a small, locked-down proxy to the YouVersion Platform API.
//
// Why a proxy? YouVersion's app key must stay private. If it were in the app,
// anyone could pull it out of the APK. Here it lives in a Supabase secret
// (YVP_APP_KEY) that only this function can read.
//
// Only signed-in users can call this (checked below with their login token),
// and only these four kinds of request are allowed.
// Bible text passes straight through; nothing is stored.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);

const API_BASE = 'https://api.youversion.com/v1';

const BIBLE_ID = /^\d{1,6}$/; // e.g. 111
const LANGUAGE = /^[a-z]{2,3}$/; // e.g. en
const CHAPTER_ID = /^[0-9A-Z]{3}\.\d{1,3}$/; // e.g. JHN.3

type YouVersionRequest =
  | { action: 'bibles'; language: string }
  | { action: 'bible'; bibleId: string }
  | { action: 'index'; bibleId: string }
  | { action: 'chapter'; bibleId: string; chapterId: string };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Turns an allowed request into a YouVersion URL, or null if it isn't allowed. */
function toApiUrl(req: YouVersionRequest): string | null {
  switch (req.action) {
    case 'bibles':
      // Only the Bibles this app's key is licensed to read.
      if (!LANGUAGE.test(req.language)) return null;
      return `${API_BASE}/bibles?language_ranges[]=${req.language}&page_size=99`;
    case 'bible':
      if (!BIBLE_ID.test(String(req.bibleId))) return null;
      return `${API_BASE}/bibles/${req.bibleId}`;
    case 'index':
      if (!BIBLE_ID.test(String(req.bibleId))) return null;
      return `${API_BASE}/bibles/${req.bibleId}/index`;
    case 'chapter':
      if (!BIBLE_ID.test(String(req.bibleId)) || !CHAPTER_ID.test(req.chapterId)) return null;
      return `${API_BASE}/bibles/${req.bibleId}/passages/${req.chapterId}?format=html&include_headings=true&include_notes=false`;
    default:
      return null;
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // The app sends the signed-in user's token as "Authorization: Bearer <token>".
  // getUser asks Supabase Auth whether it belongs to a real, signed-in user.
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return json({ error: 'Sign in required' }, 401);
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return json({ error: 'Sign in required' }, 401);

  const appKey = Deno.env.get('YVP_APP_KEY');
  if (!appKey) return json({ error: 'YVP_APP_KEY is not set' }, 500);

  let body: YouVersionRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const url = toApiUrl(body);
  if (!url) return json({ error: 'Request not allowed' }, 400);

  const upstream = await fetch(url, { headers: { 'X-YVP-App-Key': appKey } });

  // 429 comes back as plain text with a Retry-After header, not JSON.
  if (upstream.status === 429) {
    return json({ error: 'busy', retryAfter: Number(upstream.headers.get('Retry-After')) || 60 }, 429);
  }
  // 403 means our app hasn't accepted this version's publisher licence.
  if (upstream.status === 403) return json({ error: 'not_licensed' }, 403);

  const data = await upstream.json().catch(() => ({ error: 'Bad response from YouVersion' }));
  return json(data, upstream.status);
});
