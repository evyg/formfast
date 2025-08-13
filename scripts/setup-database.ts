import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Setting up FormFast database...');

  try {
    // Read and execute migration files
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).sort();

    for (const file of migrationFiles) {
      if (file.endsWith('.sql')) {
        console.log(`📄 Running migration: ${file}`);
        const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = sqlContent
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const statement of statements) {
          if (statement.trim()) {
            const { error } = await supabase.rpc('exec_sql', { sql: statement });
            if (error) {
              console.error(`❌ Error executing statement:`, statement.substring(0, 100));
              console.error(error);
            }
          }
        }
      }
    }

    // Create storage buckets
    console.log('🗂️ Creating storage buckets...');
    
    const buckets = ['uploads', 'signatures', 'completed-forms'];
    for (const bucketName of buckets) {
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: false,
        allowedMimeTypes: bucketName === 'uploads' 
          ? ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
          : ['image/png', 'image/jpeg', 'application/pdf'],
        fileSizeLimit: 52428800, // 50MB
      });

      if (error && !error.message.includes('already exists')) {
        console.error(`❌ Error creating bucket ${bucketName}:`, error);
      } else {
        console.log(`✅ Bucket ${bucketName} ready`);
      }
    }

    // Test database connection
    console.log('🔍 Testing database connection...');
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    
    if (error) {
      console.error('❌ Database connection test failed:', error);
    } else {
      console.log('✅ Database connection successful');
    }

    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Alternative function using direct SQL execution
async function executeSQL(sql: string) {
  try {
    // For Supabase, we need to use the REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SQL execution failed: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('SQL execution error:', error);
    throw error;
  }
}

async function setupDatabaseDirect() {
  console.log('🚀 Setting up FormFast database (direct SQL)...');

  try {
    // Read migration files and execute them
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).sort();

    for (const file of migrationFiles) {
      if (file.endsWith('.sql')) {
        console.log(`📄 Running migration: ${file}`);
        const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        try {
          await executeSQL(sqlContent);
          console.log(`✅ Migration ${file} completed`);
        } catch (error) {
          console.error(`❌ Migration ${file} failed:`, error);
        }
      }
    }

    console.log('🎉 Database migrations complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Try the direct approach
setupDatabaseDirect();