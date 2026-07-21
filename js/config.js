/* ============================================
   PrepNow Configuration

   The Supabase URL and anon key below are SAFE to expose in the browser —
   the database is protected by Row Level Security, so the anon key can only
   do what your RLS policies allow. They must be present for the app to work.

   The OpenAI API key is intentionally NOT here. It lives as a server-side
   secret inside the Supabase Edge Function "openai-proxy"
   (see supabase/functions/openai-proxy and the README). The browser calls
   that function and never sees the key.
   ============================================ */

const CONFIG = {
    // ── Supabase (public — protected by Row Level Security) ──
    SUPABASE_URL: 'https://swvimllkqsftzrxabgyz.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_xOwVCWMK9v0Rw02kZ-esOw_2YUg9KaV'
};
