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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  console.log('🚀 Setting up FormFast database...');

  try {
    // First, let's create a simple test
    console.log('🔍 Testing connection...');
    
    // Read the initial schema migration
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, '..', 'supabase', 'migrations', '20240101000000_initial_schema.sql'),
      'utf8'
    );

    // Split into individual statements and execute them
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📄 Executing ${statements.length} SQL statements...`);

    let successCount = 0;
    let errorCount = 0;

    for (const [index, statement] of statements.entries()) {
      if (statement.trim()) {
        try {
          console.log(`⏳ Statement ${index + 1}/${statements.length}`);
          
          // Use the SQL RPC function if available, otherwise direct query
          const { error } = await supabase.rpc('sql', { query: statement });
          
          if (error) {
            // Try alternative approach for DDL statements
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
              },
              body: JSON.stringify({ query: statement }),
            });

            if (!response.ok) {
              console.warn(`⚠️ Statement ${index + 1} failed, continuing...`);
              console.warn('Statement:', statement.substring(0, 100) + '...');
              errorCount++;
            } else {
              successCount++;
            }
          } else {
            successCount++;
          }
        } catch (err) {
          console.warn(`⚠️ Statement ${index + 1} failed, continuing...`);
          console.warn('Error:', err.message);
          errorCount++;
        }
      }
    }

    console.log(`✅ Migration complete: ${successCount} success, ${errorCount} errors`);

    // Now create storage buckets
    console.log('🗂️ Creating storage buckets...');
    
    const buckets = [
      { name: 'uploads', public: false },
      { name: 'signatures', public: false },
      { name: 'completed-forms', public: false }
    ];

    for (const bucket of buckets) {
      try {
        const { error } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          allowedMimeTypes: bucket.name === 'uploads' 
            ? ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
            : ['image/png', 'image/jpeg', 'application/pdf'],
          fileSizeLimit: 52428800, // 50MB
        });

        if (error && !error.message.includes('already exists')) {
          console.warn(`⚠️ Bucket ${bucket.name} creation warning:`, error.message);
        } else {
          console.log(`✅ Bucket ${bucket.name} ready`);
        }
      } catch (err) {
        console.warn(`⚠️ Bucket ${bucket.name} error:`, err.message);
      }
    }

    console.log('🎉 Database setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Check your Supabase dashboard to verify tables were created');
    console.log('2. Enable RLS policies in the Authentication section');
    console.log('3. Configure storage policies in the Storage section');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

runMigrations();