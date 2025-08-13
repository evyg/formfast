const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('🔍 Checking database status...');

  try {
    // Try to query each table to see what exists
    const tables = [
      'profiles', 
      'household_members', 
      'signatures', 
      'saved_dates', 
      'uploads', 
      'form_fills', 
      'billing_customers',
      'audit_logs'
    ];

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('id').limit(1);
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: exists and accessible`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }

    // Check storage buckets
    console.log('\n🗂️ Checking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Storage buckets error:', bucketsError.message);
    } else {
      buckets.forEach(bucket => {
        console.log(`✅ Bucket: ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      });
    }

    // Test auth
    console.log('\n🔐 Testing auth...');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    console.log('Auth status:', authError ? 'Not authenticated' : 'OK');

  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

checkDatabase();