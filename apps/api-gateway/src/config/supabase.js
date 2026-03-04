const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[CONFIG] Supabase credentials missing — database operations will fail.');
    // Create a stub to prevent immediate crash on import; operations will throw at call time
    supabase = null;
} else {
    console.log('[CONFIG] Supabase initialized with url:', supabaseUrl.substring(0, 20) + '...');
    supabase = createClient(supabaseUrl, supabaseAnonKey);
}

module.exports = { supabase };
