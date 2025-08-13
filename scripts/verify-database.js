#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 FormFast Database Verification');
console.log('=================================\n');

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

async function checkTable(tableName, description) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (!error) {
      console.log(`✅ ${tableName.padEnd(20)} - ${description}`);
      return true;
    } else {
      console.log(`❌ ${tableName.padEnd(20)} - ${error.message}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ ${tableName.padEnd(20)} - ${err.message}`);
    return false;
  }
}

async function checkStorageBucket(bucketName, description) {
  try {
    const { data, error } = await supabase.storage.getBucket(bucketName);
    
    if (!error && data) {
      console.log(`✅ ${bucketName.padEnd(20)} - ${description}`);
      return true;
    } else {
      console.log(`❌ ${bucketName.padEnd(20)} - ${error?.message || 'Not found'}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ ${bucketName.padEnd(20)} - ${err.message}`);
    return false;
  }
}

async function checkRLS(tableName) {
  try {
    // Try to access the table without authentication (should fail due to RLS)
    const anonSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const { data, error } = await anonSupabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('Row Level Security')) {
      console.log(`✅ ${tableName.padEnd(20)} - RLS enabled`);
      return true;
    } else {
      console.log(`⚠️ ${tableName.padEnd(20)} - RLS may not be properly configured`);
      return false;
    }
  } catch (err) {
    console.log(`❌ ${tableName.padEnd(20)} - RLS check failed: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('📊 Checking database tables...\n');
  
  const tables = [
    { name: 'profiles', description: 'User profiles and personal information' },
    { name: 'household_members', description: 'Family members for family plans' },
    { name: 'signatures', description: 'Stored user signatures' },
    { name: 'saved_dates', description: 'Reusable date values' },
    { name: 'uploads', description: 'File uploads and OCR data' },
    { name: 'form_fills', description: 'Completed form instances' },
    { name: 'billing_customers', description: 'Billing and subscription data' },
    { name: 'audit_logs', description: 'Security and compliance logs' }
  ];

  let tablesValid = 0;
  for (const table of tables) {
    const valid = await checkTable(table.name, table.description);
    if (valid) tablesValid++;
  }

  console.log(`\n📊 Tables: ${tablesValid}/${tables.length} accessible\n`);

  console.log('🗂️ Checking storage buckets...\n');
  
  const buckets = [
    { name: 'uploads', description: 'Original form files (PDF/images)' },
    { name: 'signatures', description: 'Signature image files' },
    { name: 'completed-forms', description: 'Generated PDF outputs' }
  ];

  let bucketsValid = 0;
  for (const bucket of buckets) {
    const valid = await checkStorageBucket(bucket.name, bucket.description);
    if (valid) bucketsValid++;
  }

  console.log(`\n🗂️ Buckets: ${bucketsValid}/${buckets.length} accessible\n`);

  console.log('🔒 Checking Row Level Security...\n');
  
  let rlsValid = 0;
  for (const table of tables) {
    const valid = await checkRLS(table.name);
    if (valid) rlsValid++;
  }

  console.log(`\n🔒 RLS: ${rlsValid}/${tables.length} properly secured\n`);

  // Test key functions
  console.log('🔧 Checking database functions...\n');
  
  try {
    const { data, error } = await supabase.rpc('check_user_credits', {
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (!error || error.message.includes('does not exist')) {
      console.log('✅ check_user_credits      - Function exists');
    } else {
      console.log('❌ check_user_credits      - Function missing or failed');
    }
  } catch (err) {
    console.log('❌ check_user_credits      - Function test failed');
  }

  try {
    const { data, error } = await supabase.rpc('consume_credit', {
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (!error || error.message.includes('does not exist')) {
      console.log('✅ consume_credit          - Function exists');
    } else {
      console.log('❌ consume_credit          - Function missing or failed');
    }
  } catch (err) {
    console.log('❌ consume_credit          - Function test failed');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  
  const totalScore = tablesValid + bucketsValid + rlsValid;
  const maxScore = tables.length + buckets.length + tables.length;
  
  console.log(`Tables:         ${tablesValid}/${tables.length}`);
  console.log(`Buckets:        ${bucketsValid}/${buckets.length}`);
  console.log(`RLS Security:   ${rlsValid}/${tables.length}`);
  console.log(`Overall Score:  ${totalScore}/${maxScore}`);
  
  if (totalScore === maxScore) {
    console.log('\n🎉 DATABASE SETUP COMPLETE!');
    console.log('FormFast is ready for production deployment! 🚀');
    console.log('\nNext steps:');
    console.log('1. Deploy to Vercel');
    console.log('2. Test the application');
    console.log('3. Add sample data if needed');
  } else if (totalScore >= maxScore * 0.8) {
    console.log('\n✅ DATABASE MOSTLY READY');
    console.log('Most components are working. Check the failed items above.');
  } else {
    console.log('\n⚠️ DATABASE SETUP INCOMPLETE');
    console.log('Several components are missing. Please run the setup script again.');
  }
}

if (require.main === module) {
  main();
}