import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://nsfiahwdfmnrrrmjkxjd.supabase.co';
    const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZmlhaHdkZm1ucnJybWpreGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NjMzNTEsImV4cCI6MjA4NzIzOTM1MX0.5nBNUBxTE9-Ybi6C3gNp8PabAzFu-1ebqlR5TRZrlSM';

    if (!supabaseUrl || !supabaseAnonKey) {
      // Return a proxy or throw a descriptive error when used, but don't crash on load
      throw new Error("Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.");
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'mindwhack-auth-token',
        storage: {
          getItem: (key) => {
            try {
              return window.localStorage.getItem(key);
            } catch {
              return null;
            }
          },
          setItem: (key, value) => {
            try {
              window.localStorage.setItem(key, value);
            } catch (e) {
              console.warn('Failed to set auth token in localStorage', e);
            }
          },
          removeItem: (key) => {
            try {
              window.localStorage.removeItem(key);
            } catch {
              // Ignore
            }
          }
        }
      }
    });
  }
  return supabaseInstance;
};

// For backward compatibility and easier migration, we can export a proxy or just update call sites.
// Updating call sites is safer and clearer.

export const logSignupToSheets = async (email: string, username: string) => {
  try {
    await fetch('/api/log-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        username,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error('Failed to log signup:', err);
  }
};
