import { createClient } from '@supabase/supabase-js'

// Read environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debugging: Log environment variables to see what Vite is loading
console.log('Attempting to load Supabase env vars...');
console.log('VITE_SUPABASE_URL:', supabaseUrl);
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Loaded' : 'NOT LOADED');

// Create a mock Supabase client for development when Supabase is unavailable
const createMockSupabaseClient = () => {
  console.warn('⚠️ Using mock Supabase client - authentication features disabled');
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase unavailable' } }),
      signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase unavailable' } }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: { message: 'Supabase unavailable' } }),
      update: () => Promise.resolve({ data: null, error: { message: 'Supabase unavailable' } }),
      delete: () => Promise.resolve({ data: null, error: { message: 'Supabase unavailable' } })
    })
  };
};

// Create Supabase client with fallback
let supabase;
try {
  // Basic validation
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase URL and/or anon key are missing from .env.local - using mock client');
    supabase = createMockSupabaseClient();
  } else {
    // Try to create the real client
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Disable session persistence to avoid connection issues
        autoRefreshToken: false // Disable auto-refresh to prevent connection errors
      }
    });
    console.log('✅ Supabase client created successfully');
  }
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error);
  console.warn('⚠️ Falling back to mock Supabase client');
  supabase = createMockSupabaseClient();
}

export { supabase };
