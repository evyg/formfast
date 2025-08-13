const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTablesWithAPI() {
  console.log('🚀 Attempting to create tables programmatically...');
  
  // Unfortunately, Supabase doesn't allow direct SQL execution via API
  // But let's try using the REST API directly with fetch
  
  const headers = {
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Content-Type': 'application/json'
  };

  // Try using PostgREST API to create tables
  try {
    console.log('📡 Testing connection to PostgREST API...');
    
    // First test if we can access the API
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: headers
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    if (response.ok) {
      const data = await response.text();
      console.log('✅ API connection successful');
      console.log('Response:', data);
    } else {
      console.log('❌ API connection failed');
      console.log('Error:', await response.text());
    }
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }

  // Try using Supabase Edge Functions if available
  console.log('\n🔄 Trying Edge Function approach...');
  
  try {
    const { data, error } = await supabase.functions.invoke('create-tables', {
      body: { action: 'create_schema' }
    });
    
    if (error) {
      console.log('Edge Function not available:', error.message);
    } else {
      console.log('✅ Edge Function response:', data);
    }
    
  } catch (error) {
    console.log('Edge Function error:', error.message);
  }

  // Try using the admin API if available
  console.log('\n🔄 Trying admin API approach...');
  
  try {
    const adminResponse = await fetch(`${supabaseUrl}/admin/v1/schemas`, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      }
    });
    
    if (adminResponse.ok) {
      const schemas = await adminResponse.json();
      console.log('✅ Admin API accessible, schemas:', schemas);
    } else {
      console.log('❌ Admin API not accessible:', adminResponse.status);
    }
    
  } catch (error) {
    console.log('Admin API error:', error.message);
  }

  console.log('\n📋 CONCLUSION:');
  console.log('Unfortunately, Supabase does not allow programmatic SQL execution');
  console.log('through their client libraries or REST API for security reasons.');
  console.log('\nYou have these options:');
  console.log('1. Manual: Copy SQL from scripts/create-tables.sql to Supabase Dashboard');
  console.log('2. CLI: Use Supabase CLI with: supabase db push');
  console.log('3. Migration: Use Supabase migrations system');
  
  console.log('\n🔗 Quick link to your SQL Editor:');
  console.log(`https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}/sql`);
}

createTablesWithAPI();