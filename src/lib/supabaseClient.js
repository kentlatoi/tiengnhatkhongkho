/**
 * Supabase Client — connects to Supabase if env vars are available
 * Falls back gracefully if not configured
 */
import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Auto-fix: strip /rest/v1/ suffix if accidentally included
supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

let supabase = null;

const customStorage = {
  getItem: (key) => {
    return window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
  },
  setItem: (key, value) => {
    const remember = window.localStorage.getItem('jlpt_remember_me') === 'true';
    if (remember) {
      window.localStorage.setItem(key, value);
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
      window.localStorage.removeItem(key);
    }
  },
  removeItem: (key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
};

// Only require URL + Key to activate Supabase (VITE_DATA_PROVIDER is optional)
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: customStorage,
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
