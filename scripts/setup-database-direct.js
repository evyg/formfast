#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

console.log('🚀 FormFast Direct Database Setup');
console.log('==================================\n');

const PROJECT_REF = 'bbtgrbcznxwfsfkwnfdu';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!DB_PASSWORD || DB_PASSWORD === 'your_database_password_here') {
  console.error('❌ Please update SUPABASE_DB_PASSWORD in .env.local with your actual database password');
  process.exit(1);
}

// Try multiple connection strings for different pooling modes
const connectionStrings = [
  // Session mode (port 5432)
  `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`,
  // Transaction mode (port 6543) 
  `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
  // Direct connection (IPv6)
  `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`
];

async function executeSQL(client, sql, description) {
  try {
    console.log(`⏳ ${description}...`);
    await client.query(sql);
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`⚠️ ${description} - already exists, skipping`);
      return true;
    } else {
      console.error(`❌ ${description} failed:`, error.message);
      return false;
    }
  }
}

async function verifyTable(client, tableName) {
  try {
    const result = await client.query(`SELECT count(*) FROM information_schema.tables WHERE table_name = $1`, [tableName]);
    return result.rows[0].count > 0;
  } catch (error) {
    return false;
  }
}

async function tryConnection(connectionString) {
  console.log(`🔗 Trying: ${connectionString.replace(DB_PASSWORD, '***')}`);
  
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully\n');
    return client;
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    await client.end().catch(() => {});
    return null;
  }
}

async function main() {
  console.log('📡 Connecting to Supabase PostgreSQL...\n');
  
  let client = null;
  
  // Try different connection methods
  for (const connectionString of connectionStrings) {
    client = await tryConnection(connectionString);
    if (client) break;
  }
  
  if (!client) {
    console.error('\n❌ All connection attempts failed');
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check your database password in .env.local');
    console.log('2. Verify the password in Supabase Dashboard > Settings > Database');
    console.log('3. Make sure your Supabase project is active');
    process.exit(1);
  }

  try {

    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'create-tables.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error(`❌ Schema file not found: ${schemaPath}`);
      process.exit(1);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('📄 Read schema file successfully\n');

    // Split into individual statements and execute them
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        const success = await executeSQL(
          client, 
          statement + ';', 
          `Statement ${i + 1}/${statements.length}`
        );
        
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Execution Summary:`);
    console.log(`   - Successful: ${successCount}`);
    console.log(`   - Errors: ${errorCount}\n`);

    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    const expectedTables = [
      'profiles', 'household_members', 'signatures', 'saved_dates',
      'uploads', 'form_fills', 'billing_customers', 'audit_logs'
    ];

    let tablesCreated = 0;
    for (const table of expectedTables) {
      const exists = await verifyTable(client, table);
      if (exists) {
        console.log(`✅ Table '${table}' exists`);
        tablesCreated++;
      } else {
        console.log(`❌ Table '${table}' not found`);
      }
    }

    console.log(`\n📊 Tables Summary: ${tablesCreated}/${expectedTables.length} created`);

    // Verify using Supabase client as well
    await verifyWithSupabaseClient();

    if (tablesCreated === expectedTables.length) {
      console.log('\n🎉 Database setup complete! All tables created successfully.');
      console.log('\nFormFast is ready for deployment! 🚀');
    } else {
      console.log('\n⚠️ Some tables may not have been created properly.');
      console.log('Please check the errors above.');
    }

  } catch (error) {
    console.error('❌ Database connection or execution failed:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Troubleshooting:');
      console.log('1. Check your database password in .env.local');
      console.log('2. Verify the password in Supabase Dashboard > Settings > Database');
      console.log('3. Make sure you\'re using the postgres user password');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('connection')) {
      console.log('\n💡 Troubleshooting:');
      console.log('1. Check your internet connection');
      console.log('2. Verify the project reference ID is correct');
      console.log('3. Make sure your Supabase project is active');
    }
    
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n📡 Database connection closed');
  }
}

async function verifyWithSupabaseClient() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('\n🔍 Verifying with Supabase client...');
    
    // Test a simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (!error) {
      console.log('✅ Supabase client can access tables');
    } else {
      console.log('❌ Supabase client access failed:', error.message);
    }

    // Check storage buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Could not list storage buckets:', bucketsError.message);
    } else {
      const expectedBuckets = ['uploads', 'signatures', 'completed-forms'];
      const existingBuckets = buckets.map(b => b.name);
      
      console.log('\n🗂️ Storage buckets:');
      expectedBuckets.forEach(bucket => {
        if (existingBuckets.includes(bucket)) {
          console.log(`✅ Bucket '${bucket}' exists`);
        } else {
          console.log(`❌ Bucket '${bucket}' missing`);
        }
      });
    }

  } catch (error) {
    console.log('❌ Supabase client verification failed:', error.message);
  }
}

if (require.main === module) {
  main();
}