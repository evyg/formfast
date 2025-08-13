#!/bin/bash

# FormFast Database Setup using Supabase CLI
# This script requires the Supabase CLI to be installed

echo "🚀 FormFast Database Setup via Supabase CLI"
echo "==========================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo ""
    echo "To install Supabase CLI, run:"
    echo "  brew install supabase/tap/supabase  # macOS"
    echo "  OR"
    echo "  npm install -g supabase              # via npm"
    echo ""
    exit 1
fi

# Get the project ID from the Supabase URL
SUPABASE_URL="https://bbtgrbcznxwfsfkwnfdu.supabase.co"
PROJECT_ID="bbtgrbcznxwfsfkwnfdu"

echo "📍 Project ID: $PROJECT_ID"
echo ""

# Link to the Supabase project
echo "🔗 Linking to Supabase project..."
supabase link --project-ref $PROJECT_ID

# Check if linking was successful
if [ $? -ne 0 ]; then
    echo "❌ Failed to link to Supabase project."
    echo "Please make sure you're logged in: supabase login"
    exit 1
fi

# Run the migration
echo ""
echo "📄 Running database migration..."
supabase db push

# Alternative: Run SQL directly
echo ""
echo "🗄️ Creating tables..."
supabase db execute -f scripts/create-tables.sql

echo ""
echo "✅ Database setup complete!"
echo ""
echo "You can verify the tables in your Supabase Dashboard:"
echo "https://supabase.com/dashboard/project/$PROJECT_ID/editor"