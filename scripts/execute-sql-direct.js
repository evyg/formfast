const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQL() {
  console.log('🚀 Attempting direct SQL execution...');
  
  try {
    // Try using PostgREST's direct SQL execution if available
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        query: 'SELECT current_database(), current_user, version();'
      })
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SQL execution successful!');
      console.log('Result:', result);
      
      // If this works, try creating tables
      await createTablesDirectly();
      
    } else {
      const error = await response.text();
      console.log('❌ SQL execution failed:', error);
      console.log('\n📝 Manual setup is required. Please:');
      console.log('1. Go to: https://supabase.com/dashboard/project/bbtgrbcznxwfsfkwnfdu/sql');
      console.log('2. Copy the SQL from scripts/create-tables.sql');
      console.log('3. Paste and run it in the SQL Editor');
    }
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.log('\n📝 Manual setup is required. Please run the SQL manually.');
  }
}

async function createTablesDirectly() {
  console.log('\n🗄️ Creating tables...');
  
  // Read the SQL file
  const sqlPath = path.join(__dirname, 'create-tables.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: sql
      })
    });
    
    if (response.ok) {
      console.log('✅ Tables created successfully!');
      
      // Verify tables exist
      await verifyTables();
      
    } else {
      const error = await response.text();
      console.log('❌ Table creation failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Table creation error:', error.message);
  }
}

async function verifyTables() {
  console.log('\n🔍 Verifying tables...');
  
  const tables = [
    'profiles', 'household_members', 'signatures', 'saved_dates',
    'uploads', 'form_fills', 'billing_customers', 'audit_logs'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (!error) {
        console.log(`✅ Table '${table}' exists and accessible`);
      } else {
        console.log(`❌ Table '${table}' not accessible: ${error.message}`);
      }
    } catch (err) {
      console.log(`❌ Table '${table}' check failed: ${err.message}`);
    }
  }
}

executeSQL();