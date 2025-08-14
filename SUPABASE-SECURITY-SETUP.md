# FormFast Supabase Security Setup

This document explains how to properly secure your FormFast Supabase database with Row Level Security (RLS) policies.

## ⚠️ IMPORTANT - Security Notice

Your FormFast application is **NOT SECURE** until you complete this setup. Without RLS policies, users can access each other's data.

## Prerequisites

1. Access to your Supabase Dashboard
2. Database Admin privileges
3. All database tables created (profiles, uploads, signatures, etc.)

## Setup Steps

### Step 1: Access Supabase SQL Editor

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your FormFast project
3. Navigate to **SQL Editor** in the sidebar
4. Create a new query

### Step 2: Run RLS Policies

1. Open the file `supabase-rls-policies.sql` in this directory
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run** to execute all policies

### Step 3: Verify RLS is Active

Run this verification query in the SQL Editor:

```sql
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'profiles', 'household_members', 'signatures', 
        'saved_dates', 'uploads', 'form_fills', 
        'billing_customers', 'audit_logs'
    );
```

All tables should show `rls_enabled = true`.

### Step 4: Test Security (Optional)

Create a test user and verify they can only access their own data:

1. Create a new user account through your app
2. Upload a test document
3. In SQL Editor, run: `SELECT * FROM uploads;`
4. You should only see uploads from the authenticated user

## What These Policies Do

### 📋 Table Security

- **profiles**: Users can only view/edit their own profile
- **uploads**: Users can only access their uploaded files
- **signatures**: Users can only manage their own signatures
- **form_fills**: Users can only see their completed forms
- **billing_customers**: Users can only access their billing info
- **audit_logs**: Users can view their own audit trail (read-only)

### 🗄️ Storage Security

- **uploads** bucket: Users can only access files in their user folder
- **signatures** bucket: Users can only access their signature files
- **completed-forms** bucket: Users can only download their completed forms

### 🔧 Helper Functions

- `add_user_credits()`: Safely add credits to user accounts (Stripe webhooks)
- `consume_user_credits()`: Deduct credits when processing forms
- `can_user_process_forms()`: Check if user has processing credits/plan

### 📊 Audit Logging

Automatically logs sensitive operations:
- Profile changes
- Billing updates  
- Form processing
- Includes IP addresses and timestamps

## Environment Variables Required

Make sure these are set in your environment:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe (optional)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
STRIPE_INDIVIDUAL_PRICE_ID=price_xxxxx
STRIPE_FAMILY_PRICE_ID=price_xxxxx
STRIPE_PAYG_PRICE_ID=price_xxxxx

# OpenAI (optional - has fallback)
OPENAI_API_KEY=your_openai_key
```

## Testing Your Setup

1. **Create Test Users**: Register 2-3 test accounts
2. **Upload Documents**: Have each user upload different files
3. **Verify Isolation**: Confirm users can't see each other's data
4. **Test Storage**: Check file access permissions
5. **Monitor Audit Logs**: Verify actions are being logged

## Common Issues & Solutions

### Issue: "RLS policy violation" errors
**Solution**: Make sure all policies are created and auth.uid() is available

### Issue: Users can't access their own data
**Solution**: Check that user_id fields reference auth.uid()

### Issue: Storage files not accessible
**Solution**: Verify bucket policies are applied and folder structure matches user IDs

### Issue: Service functions not working
**Solution**: Ensure functions have SECURITY DEFINER and proper permissions

## Production Checklist

- [ ] All RLS policies applied and tested
- [ ] Storage bucket policies configured
- [ ] Helper functions working correctly
- [ ] Audit logging active
- [ ] Test users can only access own data
- [ ] Service role key secured and not exposed
- [ ] Database backups configured
- [ ] Monitoring alerts set up

## Security Best Practices

1. **Never expose service role key** in client-side code
2. **Use anon key** for client authentication only  
3. **Monitor audit logs** regularly for suspicious activity
4. **Backup database** before major changes
5. **Test thoroughly** with multiple user accounts
6. **Keep policies simple** and well-documented

## Support

If you encounter issues with RLS setup:

1. Check Supabase logs for specific error messages
2. Verify user authentication is working properly
3. Test queries with different user contexts
4. Review the SQL policies for syntax errors

Remember: **Security is not optional** - complete this setup before deploying to production!