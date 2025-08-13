-- RLS Policies for FormFast Database
-- This migration adds Row Level Security policies to all tables

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage their household members" ON household_members;
DROP POLICY IF EXISTS "Users can manage their own signatures" ON signatures;
DROP POLICY IF EXISTS "Users can manage their own saved dates" ON saved_dates;
DROP POLICY IF EXISTS "Users can manage their own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can manage their own form fills" ON form_fills;
DROP POLICY IF EXISTS "Users can view their own billing info" ON billing_customers;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;

-- Create new policies
CREATE POLICY "Users can manage their own profile" ON profiles
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage their household members" ON household_members
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own signatures" ON signatures
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own saved dates" ON saved_dates
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own uploads" ON uploads
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own form fills" ON form_fills
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view their own billing info" ON billing_customers
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (user_id = auth.uid());