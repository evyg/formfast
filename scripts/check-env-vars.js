#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 FormFast Environment Variables Check');
console.log('=======================================\n');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const requiredVars = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Supabase project URL',
    required: true,
    example: 'https://your-project.supabase.co'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Supabase anonymous key (public)',
    required: true,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service role key (private)',
    required: true,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  {
    name: 'OPENAI_API_KEY',
    description: 'OpenAI API key for field classification',
    required: true,
    example: 'sk-proj-...'
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    description: 'Your application URL',
    required: false,
    example: 'https://your-app.vercel.app'
  },
  {
    name: 'DEV_MODE_OCR',
    description: 'Use Tesseract.js instead of AWS Textract',
    required: false,
    example: 'true'
  }
];

const optionalVars = [
  {
    name: 'AWS_TEXTRACT_REGION',
    description: 'AWS region for Textract (enhanced OCR)',
    example: 'us-east-1'
  },
  {
    name: 'AWS_ACCESS_KEY_ID',
    description: 'AWS access key for Textract',
    example: 'AKIA...'
  },
  {
    name: 'AWS_SECRET_ACCESS_KEY',
    description: 'AWS secret key for Textract',
    example: 'your-secret-key'
  },
  {
    name: 'STRIPE_SECRET_KEY',
    description: 'Stripe secret key for payments',
    example: 'sk_test_...'
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    description: 'Stripe publishable key for payments',
    example: 'pk_test_...'
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    description: 'Stripe webhook secret',
    example: 'whsec_...'
  }
];

function checkVariable(varConfig) {
  const value = process.env[varConfig.name];
  const hasValue = value && value !== 'your_' + varConfig.name.toLowerCase() + '_here';
  
  if (hasValue) {
    const displayValue = value.length > 50 ? value.substring(0, 20) + '...' : value;
    console.log(`✅ ${varConfig.name.padEnd(35)} - ${displayValue}`);
    return true;
  } else if (varConfig.required) {
    console.log(`❌ ${varConfig.name.padEnd(35)} - MISSING (Required)`);
    return false;
  } else {
    console.log(`⚠️ ${varConfig.name.padEnd(35)} - Not set (Optional)`);
    return true;
  }
}

console.log('📋 Required Environment Variables:\n');
let allRequiredSet = true;

for (const varConfig of requiredVars) {
  const isSet = checkVariable(varConfig);
  if (varConfig.required && !isSet) {
    allRequiredSet = false;
  }
}

console.log('\n📋 Optional Environment Variables:\n');

for (const varConfig of optionalVars) {
  checkVariable(varConfig);
}

console.log('\n' + '='.repeat(50));
console.log('📊 ENVIRONMENT CHECK SUMMARY');
console.log('='.repeat(50));

if (allRequiredSet) {
  console.log('✅ All required environment variables are set!');
  console.log('🚀 FormFast is ready for deployment.');
  
  console.log('\n🔧 For Vercel deployment, add these variables in your Vercel dashboard:');
  console.log('https://vercel.com/dashboard → Your Project → Settings → Environment Variables\n');
  
  requiredVars.forEach(varConfig => {
    const value = process.env[varConfig.name];
    if (value) {
      console.log(`${varConfig.name} = ${value}`);
    }
  });
  
} else {
  console.log('❌ Some required environment variables are missing.');
  console.log('\n🔧 To fix this:');
  console.log('1. Copy .env.example to .env.local');
  console.log('2. Fill in the missing values');
  console.log('3. Run this script again to verify');
  
  console.log('\n📝 Missing variables:');
  requiredVars.forEach(varConfig => {
    if (varConfig.required && !process.env[varConfig.name]) {
      console.log(`   ${varConfig.name} - ${varConfig.description}`);
      console.log(`   Example: ${varConfig.example}\n`);
    }
  });
}

console.log('\n📖 For more help, see: DEPLOYMENT_COMPLETE.md');