const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTables() {
  console.log('🚀 Setting up FormFast database...');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);

  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'create-tables.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Executing database schema...');

    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          
          const { error } = await supabase.rpc('sql', { 
            query: statement + ';' 
          });

          if (error) {
            // Some errors are expected (like "already exists")
            if (error.message?.includes('already exists') || 
                error.message?.includes('does not exist')) {
              console.log(`⚠️  Statement ${i + 1}: ${error.message} (continuing...)`);
            } else {
              console.error(`❌ Statement ${i + 1} failed:`, error.message);
              errorCount++;
            }
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Statement ${i + 1} exception:`, err.message);
          errorCount++;
        }
      }
    }

    console.log(`\n✅ Schema execution complete:`);
    console.log(`   - Successful: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);

    // Test the setup by checking if tables exist
    console.log('\n🔍 Verifying table creation...');
    
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

    let tablesCreated = 0;
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Table '${table}' exists and is accessible`);
          tablesCreated++;
        } else {
          console.log(`❌ Table '${table}' not accessible: ${error.message}`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}' check failed: ${err.message}`);
      }
    }

    console.log(`\n📊 Tables created: ${tablesCreated}/${tables.length}`);

    // Check storage buckets
    console.log('\n🗂️  Verifying storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Could not list storage buckets:', bucketsError.message);
    } else {
      const expectedBuckets = ['uploads', 'signatures', 'completed-forms'];
      const existingBuckets = buckets.map(b => b.name);
      
      expectedBuckets.forEach(bucket => {
        if (existingBuckets.includes(bucket)) {
          console.log(`✅ Bucket '${bucket}' exists`);
        } else {
          console.log(`❌ Bucket '${bucket}' missing`);
        }
      });
    }

    if (tablesCreated === tables.length) {
      console.log('\n🎉 Database setup complete! FormFast is ready to use.');
      console.log('\nNext steps:');
      console.log('1. Deploy to Vercel with environment variables');
      console.log('2. Test file upload functionality');
      console.log('3. Verify OCR processing works');
    } else {
      console.log('\n⚠️  Some tables may not have been created properly.');
      console.log('You might need to run the SQL manually in Supabase dashboard.');
    }

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Alternative method if RPC doesn't work
async function createTablesAlternative() {
  console.log('🔄 Trying alternative setup method...');
  
  try {
    // Test basic connection first
    const { data, error } = await supabase.auth.getUser();
    console.log('📡 Supabase connection test:', error ? 'Failed' : 'Success');

    // Try to create tables one by one with individual queries
    const tableCreationQueries = [
      `CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
        full_name TEXT,
        date_of_birth DATE,
        email TEXT,
        phone TEXT,
        address JSONB,
        custom_fields JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY`,
      
      `CREATE POLICY "Users can manage their own profile" ON profiles
        FOR ALL USING (user_id = auth.uid())`
    ];

    for (const query of tableCreationQueries) {
      try {
        const { error } = await supabase.rpc('sql', { query });
        if (error && !error.message.includes('already exists')) {
          console.log('Query error:', error.message);
        }
      } catch (err) {
        console.log('Query exception:', err.message);
      }
    }

    console.log('✅ Alternative setup attempted');
    
  } catch (error) {
    console.error('❌ Alternative setup failed:', error);
  }
}

// Run the setup
createTables().catch((error) => {
  console.error('Main setup failed, trying alternative...', error);
  createTablesAlternative();
});