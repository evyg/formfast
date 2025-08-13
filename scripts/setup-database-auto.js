#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

console.log('🚀 FormFast Automated Database Setup');
console.log('=====================================\n');

const PROJECT_REF = 'bbtgrbcznxwfsfkwnfdu';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!DB_PASSWORD || DB_PASSWORD === 'your_database_password_here') {
  console.error('❌ Please update SUPABASE_DB_PASSWORD in .env.local with your actual database password');
  console.log('\nYou can find your database password in:');
  console.log('https://supabase.com/dashboard/project/bbtgrbcznxwfsfkwnfdu/settings/database');
  process.exit(1);
}

async function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`⏳ Running: ${command}`);
    
    const child = spawn('bash', ['-c', command], {
      stdio: 'pipe',
      env: { ...process.env, SUPABASE_DB_PASSWORD: DB_PASSWORD },
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

async function checkSupabaseCLI() {
  try {
    const result = await runCommand('which supabase');
    console.log('✅ Supabase CLI found\n');
    return true;
  } catch (error) {
    console.error('❌ Supabase CLI not found. Please install it:');
    console.log('npm install -g supabase');
    console.log('or');
    console.log('brew install supabase/tap/supabase');
    return false;
  }
}

async function linkProject() {
  try {
    // Check if already linked
    if (fs.existsSync('.supabase/config.json')) {
      console.log('✅ Project already linked\n');
      return true;
    }

    console.log(`🔗 Linking to Supabase project ${PROJECT_REF}...`);
    await runCommand(`supabase link --project-ref ${PROJECT_REF}`);
    console.log('✅ Project linked successfully\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to link project:', error.message);
    return false;
  }
}

async function pushMigrations() {
  try {
    console.log('📄 Pushing database migrations...');
    
    // Use dry-run first to check what will be applied
    console.log('🔍 Checking migrations with dry-run...');
    await runCommand('supabase db push --dry-run');
    
    console.log('\n💾 Applying migrations...');
    await runCommand('supabase db push');
    
    console.log('✅ Database migrations applied successfully\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to push migrations:', error.message);
    return false;
  }
}

async function verifySetup() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔍 Verifying database setup...');
  
  const tables = [
    'profiles', 'household_members', 'signatures', 'saved_dates',
    'uploads', 'form_fills', 'billing_customers', 'audit_logs'
  ];

  let successCount = 0;
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (!error) {
        console.log(`✅ Table '${table}' exists and accessible`);
        successCount++;
      } else {
        console.log(`❌ Table '${table}' not accessible: ${error.message}`);
      }
    } catch (err) {
      console.log(`❌ Table '${table}' check failed: ${err.message}`);
    }
  }

  // Check storage buckets
  console.log('\n🗂️ Checking storage buckets...');
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

  return successCount === tables.length;
}

async function main() {
  try {
    // Step 1: Check Supabase CLI
    const hasSupabaseCLI = await checkSupabaseCLI();
    if (!hasSupabaseCLI) {
      process.exit(1);
    }

    // Step 2: Link project
    const linked = await linkProject();
    if (!linked) {
      console.log('\n🔄 Trying alternative setup method...');
      // Fall back to direct connection script
      const directScript = path.join(__dirname, 'setup-database-direct.js');
      if (fs.existsSync(directScript)) {
        require(directScript);
        return;
      } else {
        console.error('❌ Alternative setup script not found');
        process.exit(1);
      }
    }

    // Step 3: Push migrations
    const pushed = await pushMigrations();
    if (!pushed) {
      console.log('\n🔄 Migration push failed, trying alternative method...');
      const directScript = path.join(__dirname, 'setup-database-direct.js');
      if (fs.existsSync(directScript)) {
        require(directScript);
        return;
      }
    }

    // Step 4: Verify setup
    const verified = await verifySetup();
    
    if (verified) {
      console.log('\n🎉 Database setup complete! All tables created successfully.');
      console.log('\nNext steps:');
      console.log('1. Deploy to Vercel');
      console.log('2. Test the application');
      console.log('3. Add sample data if needed');
    } else {
      console.log('\n⚠️ Some tables may not have been created properly.');
      console.log('Please check the errors above and try running the script again.');
    }

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\nTrying direct database connection as fallback...');
    
    const directScript = path.join(__dirname, 'setup-database-direct.js');
    if (fs.existsSync(directScript)) {
      require(directScript);
    } else {
      console.error('❌ No fallback method available');
      process.exit(1);
    }
  }
}

if (require.main === module) {
  main();
}