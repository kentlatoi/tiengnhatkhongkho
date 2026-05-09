/**
 * Supabase Client — connects to Supabase if env vars are available
 * Falls back gracefully if not configured
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

// Only require URL + Key to activate Supabase (VITE_DATA_PROVIDER is optional)
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    console.log('[JLPT LMS] ✅ Supabase client initialized:', supabaseUrl);
  } catch (err) {
    console.error('[JLPT LMS] ❌ Failed to create Supabase client:', err);
    supabase = null;
  }
} else {
  console.warn(
    '[JLPT LMS] ⚠️ Supabase env vars missing. Using localStorage fallback.',
    { url: !!supabaseUrl, key: !!supabaseAnonKey }
  );
}

/**
 * Check if Supabase is configured and available
 */
export function isSupabase() {
  return supabase !== null;
}

export { supabase };
export default supabase;
