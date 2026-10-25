// Edge Function: a small, locked-down proxy to API.Bible.
//
// Why a proxy? The API.Bible key is a secret. If it were in the app, anyone
// could pull it out and use up our free 5,000 requests a month. Here it lives
// in a Supabase secret (API_BIBLE_KEY) that only this function can read.
//
// Only signed-in users can call this (checked below with their login token),
// and only these four kinds of request are allowed.
// Bible text passes through; nothing is stored.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);

const API_BASE = 'https://rest.api.bible/v1';

const BIBLE_ID = /^[A-Za-z0-9-]{1,40}$/;
const LANGUAGE = /^[a-z]{3}$/; // ISO 639-3, e.g. eng, tgl, ceb
const CHAPTER_ID = /^[0-9A-Z]{3}\.(\d{1,3}|intro)$/; // e.g. JHN.3

type BibleRequest =
  | { action: 'bibles'; language: string }
  | { action: 'bible'; bibleId: string }
  | { action: 'books'; bibleId: string }
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

/** Turns an allowed request into an API.Bible URL, or null if it isn't allowed. */
function toApiUrl(req: BibleRequest): string | null {
  switch (req.action) {
    case 'bibles':
      if (!LANGUAGE.test(req.language)) return null;
      return `${API_BASE}/bibles?language=${req.language}`;
    case 'bible':
      if (!BIBLE_ID.test(req.bibleId)) return null;
      return `${API_BASE}/bibles/${req.bibleId}`;
    case 'books':
      if (!BIBLE_ID.test(req.bibleId)) return null;
      return `${API_BASE}/bibles/${req.bibleId}/books?include-chapters=true`;
    case 'chapter':
      if (!BIBLE_ID.test(req.bibleId) || !CHAPTER_ID.test(req.chapterId)) return null;
      return (
        `${API_BASE}/bibles/${req.bibleId}/chapters/${req.chapterId}` +
        '?content-type=json&include-notes=false&include-titles=true&include-verse-numbers=true'
      );
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

  const apiKey = Deno.env.get('API_BIBLE_KEY');
  if (!apiKey) return json({ error: 'API_BIBLE_KEY is not set' }, 500);

  let body: BibleRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const url = toApiUrl(body);
  if (!url) return json({ error: 'Request not allowed' }, 400);

  const upstream = await fetch(url, { headers: { 'api-key': apiKey } });
  const data = await upstream.json().catch(() => ({ error: 'Bad response from API.Bible' }));
  return json(data, upstream.status);
});
