/**
 * Supabase Client — connects to Supabase if env vars are available
 * Falls back gracefully if not configured
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const dataProvider = import.meta.env.VITE_DATA_PROVIDER;

let supabase = null;

if (supabaseUrl && supabaseAnonKey && dataProvider === 'supabase') {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} else {
  console.warn(
    '[JLPT LMS] Supabase env vars missing or VITE_DATA_PROVIDER !== "supabase". Using localStorage fallback.'
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
