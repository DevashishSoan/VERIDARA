import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock-veridara.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-anon-key-prevent-crash';

if (supabaseUrl === 'https://mock-veridara.supabase.co') {
    console.warn('Supabase credentials missing. Cloud persistence may be disabled, using mock client to prevent crash.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
