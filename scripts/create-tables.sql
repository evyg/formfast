-- FormFast Database Schema
-- Copy and paste this entire script into your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table for user personal information
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT,
    date_of_birth DATE,
    email TEXT,
    phone TEXT,
    address JSONB,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Household members for family plan support
CREATE TABLE IF NOT EXISTS household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    date_of_birth DATE,
    relationship TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signatures storage (multiple per user)
CREATE TABLE IF NOT EXISTS signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    label TEXT DEFAULT 'default',
    image_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved dates for reuse
CREATE TABLE IF NOT EXISTS saved_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL,
    value DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uploads table for original files and OCR data
CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT,
    ocr_json JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form fills for completed forms
CREATE TABLE IF NOT EXISTS form_fills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE NOT NULL,
    mapping JSONB NOT NULL,
    output_pdf_path TEXT,
    credits_spent INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing and subscription management
CREATE TABLE IF NOT EXISTS billing_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    stripe_customer_id TEXT UNIQUE,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'individual', 'family', 'payg')),
    credits INTEGER DEFAULT 1,
    subscription_status TEXT,
    subscription_id TEXT,
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs for compliance and security
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can manage their own profile" ON profiles
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for household_members
CREATE POLICY "Users can manage their household members" ON household_members
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for signatures
CREATE POLICY "Users can manage their own signatures" ON signatures
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for saved_dates
CREATE POLICY "Users can manage their own saved dates" ON saved_dates
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for uploads
CREATE POLICY "Users can manage their own uploads" ON uploads
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for form_fills
CREATE POLICY "Users can manage their own form fills" ON form_fills
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for billing_customers
CREATE POLICY "Users can view their own billing info" ON billing_customers
    FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for audit_logs
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_signatures_user_id ON signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_dates_user_id ON saved_dates(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
CREATE INDEX IF NOT EXISTS idx_form_fills_user_id ON form_fills(user_id);
CREATE INDEX IF NOT EXISTS idx_form_fills_upload_id ON form_fills(upload_id);
CREATE INDEX IF NOT EXISTS idx_billing_customers_user_id ON billing_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_customers_stripe_id ON billing_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create a function to automatically create a profile and billing record for new users
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id, email) VALUES (NEW.id, NEW.email);
    INSERT INTO billing_customers (user_id, credits) VALUES (NEW.id, 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Function to check user credits
CREATE OR REPLACE FUNCTION check_user_credits(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_plan TEXT;
    user_credits INTEGER;
BEGIN
    SELECT plan, credits INTO user_plan, user_credits
    FROM billing_customers
    WHERE user_id = p_user_id;
    
    -- Free users get 1 credit, paid plans get unlimited
    IF user_plan IN ('individual', 'family') THEN
        RETURN TRUE;
    ELSIF user_plan = 'payg' AND user_credits > 0 THEN
        RETURN TRUE;
    ELSIF user_plan = 'free' AND user_credits > 0 THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consume credits
CREATE OR REPLACE FUNCTION consume_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_plan TEXT;
    user_credits INTEGER;
BEGIN
    SELECT plan, credits INTO user_plan, user_credits
    FROM billing_customers
    WHERE user_id = p_user_id;
    
    -- Don't consume credits for paid plans
    IF user_plan IN ('individual', 'family') THEN
        RETURN TRUE;
    END IF;
    
    -- Consume credit for free and pay-as-you-go users
    IF user_credits > 0 THEN
        UPDATE billing_customers
        SET credits = credits - 1
        WHERE user_id = p_user_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;