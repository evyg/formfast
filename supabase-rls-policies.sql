-- FormFast Row Level Security (RLS) Policies
-- Run these commands in your Supabase SQL Editor to enable security

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ================================
-- PROFILES TABLE POLICIES
-- ================================

-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (for new user registration)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ================================
-- HOUSEHOLD_MEMBERS TABLE POLICIES
-- ================================

-- Users can view their own household members
CREATE POLICY "Users can view own household members" ON household_members
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert household members for themselves
CREATE POLICY "Users can insert own household members" ON household_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own household members
CREATE POLICY "Users can update own household members" ON household_members
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own household members
CREATE POLICY "Users can delete own household members" ON household_members
    FOR DELETE USING (auth.uid() = user_id);

-- ================================
-- SIGNATURES TABLE POLICIES
-- ================================

-- Users can view their own signatures
CREATE POLICY "Users can view own signatures" ON signatures
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own signatures
CREATE POLICY "Users can insert own signatures" ON signatures
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own signatures
CREATE POLICY "Users can update own signatures" ON signatures
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own signatures
CREATE POLICY "Users can delete own signatures" ON signatures
    FOR DELETE USING (auth.uid() = user_id);

-- ================================
-- SAVED_DATES TABLE POLICIES
-- ================================

-- Users can view their own saved dates
CREATE POLICY "Users can view own saved dates" ON saved_dates
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own saved dates
CREATE POLICY "Users can insert own saved dates" ON saved_dates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved dates
CREATE POLICY "Users can update own saved dates" ON saved_dates
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own saved dates
CREATE POLICY "Users can delete own saved dates" ON saved_dates
    FOR DELETE USING (auth.uid() = user_id);

-- ================================
-- UPLOADS TABLE POLICIES
-- ================================

-- Users can view their own uploads
CREATE POLICY "Users can view own uploads" ON uploads
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own uploads
CREATE POLICY "Users can insert own uploads" ON uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own uploads
CREATE POLICY "Users can update own uploads" ON uploads
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own uploads" ON uploads
    FOR DELETE USING (auth.uid() = user_id);

-- ================================
-- FORM_FILLS TABLE POLICIES
-- ================================

-- Users can view their own form fills
CREATE POLICY "Users can view own form fills" ON form_fills
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own form fills
CREATE POLICY "Users can insert own form fills" ON form_fills
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own form fills
CREATE POLICY "Users can update own form fills" ON form_fills
    FOR UPDATE USING (auth.uid() = user_id);

-- ================================
-- BILLING_CUSTOMERS TABLE POLICIES
-- ================================

-- Users can view their own billing information
CREATE POLICY "Users can view own billing" ON billing_customers
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own billing information
CREATE POLICY "Users can insert own billing" ON billing_customers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own billing information
CREATE POLICY "Users can update own billing" ON billing_customers
    FOR UPDATE USING (auth.uid() = user_id);

-- ================================
-- AUDIT_LOGS TABLE POLICIES
-- ================================

-- Users can view their own audit logs (read-only for security)
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Only the system can insert audit logs (no user inserts)
-- This is handled by the service role key in the application

-- ================================
-- STORAGE BUCKET POLICIES
-- ================================

-- Enable RLS on storage buckets
UPDATE storage.buckets SET public = false WHERE id IN ('uploads', 'signatures', 'completed-forms');

-- Uploads bucket policies
CREATE POLICY "Users can view own uploads" ON storage.objects
    FOR SELECT USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can insert own uploads" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own uploads" ON storage.objects
    FOR UPDATE USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own uploads" ON storage.objects
    FOR DELETE USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Signatures bucket policies
CREATE POLICY "Users can view own signatures" ON storage.objects
    FOR SELECT USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can insert own signatures" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own signatures" ON storage.objects
    FOR UPDATE USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own signatures" ON storage.objects
    FOR DELETE USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Completed forms bucket policies
CREATE POLICY "Users can view own completed forms" ON storage.objects
    FOR SELECT USING (bucket_id = 'completed-forms' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can insert own completed forms" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'completed-forms' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ================================
-- HELPER FUNCTIONS
-- ================================

-- Function to add credits to user (used by Stripe webhook)
CREATE OR REPLACE FUNCTION add_user_credits(user_id UUID, credits INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles 
    SET 
        credits = COALESCE(credits, 0) + add_user_credits.credits,
        updated_at = NOW()
    WHERE id = add_user_credits.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consume credits (used when processing forms)
CREATE OR REPLACE FUNCTION consume_user_credits(user_id UUID, credits_to_consume INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
    user_plan TEXT;
BEGIN
    -- Get user's current credits and plan
    SELECT credits, subscription_tier INTO current_credits, user_plan
    FROM profiles WHERE id = consume_user_credits.user_id;
    
    -- If user has unlimited plan (individual or family), allow processing
    IF user_plan IN ('individual', 'family') THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user has enough credits
    IF COALESCE(current_credits, 0) >= credits_to_consume THEN
        -- Consume credits
        UPDATE profiles 
        SET 
            credits = credits - credits_to_consume,
            updated_at = NOW()
        WHERE id = consume_user_credits.user_id;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can process forms
CREATE OR REPLACE FUNCTION can_user_process_forms(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_plan TEXT;
    current_credits INTEGER;
BEGIN
    SELECT subscription_tier, credits INTO user_plan, current_credits
    FROM profiles WHERE id = can_user_process_forms.user_id;
    
    -- Unlimited plans can always process
    IF user_plan IN ('individual', 'family') THEN
        RETURN TRUE;
    END IF;
    
    -- Check credits for free/pay-as-you-go users
    RETURN COALESCE(current_credits, 0) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- TRIGGERS FOR AUDIT LOGGING
-- ================================

-- Function to log sensitive operations
CREATE OR REPLACE FUNCTION log_user_action()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the action to audit_logs table
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        ip_address
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        CASE 
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
            WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
            ELSE NULL
        END,
        CASE 
            WHEN TG_OP = 'DELETE' THEN NULL
            ELSE row_to_json(NEW)
        END,
        inet_client_addr()::text
    );
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit logging on sensitive tables
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION log_user_action();

CREATE TRIGGER audit_billing_customers AFTER INSERT OR UPDATE OR DELETE ON billing_customers
    FOR EACH ROW EXECUTE FUNCTION log_user_action();

CREATE TRIGGER audit_form_fills AFTER INSERT OR UPDATE ON form_fills
    FOR EACH ROW EXECUTE FUNCTION log_user_action();

-- ================================
-- VERIFICATION QUERIES
-- ================================

-- Run these to verify RLS is working:
-- (These will only return data for the authenticated user)

/*
SELECT 'profiles' as table_name, count(*) as accessible_rows FROM profiles;
SELECT 'uploads' as table_name, count(*) as accessible_rows FROM uploads;
SELECT 'signatures' as table_name, count(*) as accessible_rows FROM signatures;
SELECT 'form_fills' as table_name, count(*) as accessible_rows FROM form_fills;
*/

-- Check RLS status
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

COMMENT ON TABLE profiles IS 'RLS enabled - users can only access their own profile';
COMMENT ON TABLE uploads IS 'RLS enabled - users can only access their own uploads';
COMMENT ON TABLE signatures IS 'RLS enabled - users can only access their own signatures';
COMMENT ON TABLE form_fills IS 'RLS enabled - users can only access their own form fills';
COMMENT ON TABLE billing_customers IS 'RLS enabled - users can only access their own billing info';