const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Try to load from api-gateway .env
if (fs.existsSync('apps/api-gateway/.env')) {
    dotenv.config({ path: 'apps/api-gateway/.env' });
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkConfig() {
    console.log('Querying system_config targeting URL:', process.env.SUPABASE_URL);
    const { data, error } = await supabase
        .from('system_config')
        .select('*');

    if (error) {
        console.error('Error fetching config:', error);
    } else {
        console.log('Current System Config:', JSON.stringify(data, null, 2));
    }
}

checkConfig();
