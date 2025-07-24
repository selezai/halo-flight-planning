import { createClient } from '@supabase/supabase-js'

// Read environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debugging: Log environment variables to see what Vite is loading
console.log('Attempting to load Supabase env vars...');
console.log('VITE_SUPABASE_URL:', supabaseUrl);
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Loaded' : 'NOT LOADED');

// Basic validation
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and/or anon key are missing from .env.local');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
