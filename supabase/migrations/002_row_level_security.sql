-- SEO ROI Assessment Tool - Row Level Security Policies
-- This migration sets up RLS policies for secure data access

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can read their own record
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (id = auth.uid()::uuid);

-- Users can insert their own record  
CREATE POLICY "Users can insert own data" ON users
    FOR INSERT WITH CHECK (id = auth.uid()::uuid);

-- Users can update their own record
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (id = auth.uid()::uuid);

-- Service role can access all user data (for admin operations)
CREATE POLICY "Service role full access to users" ON users
    FOR ALL USING (current_setting('role') = 'service_role');

-- Campaigns table policies
-- Users can read their own campaigns
CREATE POLICY "Users can view own campaigns" ON campaigns
    FOR SELECT USING (user_id = auth.uid()::uuid);

-- Users can insert their own campaigns
CREATE POLICY "Users can insert own campaigns" ON campaigns
    FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

-- Users can update their own campaigns
CREATE POLICY "Users can update own campaigns" ON campaigns
    FOR UPDATE USING (user_id = auth.uid()::uuid);

-- Service role can access all campaign data
CREATE POLICY "Service role full access to campaigns" ON campaigns
    FOR ALL USING (current_setting('role') = 'service_role');

-- Reports table policies
-- Users can read their own reports
CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT USING (user_id = auth.uid()::uuid);

-- Only the system (service role) can insert reports
CREATE POLICY "Service role can insert reports" ON reports
    FOR INSERT WITH CHECK (current_setting('role') = 'service_role');

-- Only the system (service role) can update reports
CREATE POLICY "Service role can update reports" ON reports
    FOR UPDATE USING (current_setting('role') = 'service_role');

-- Service role can delete reports (for cleanup)
CREATE POLICY "Service role can delete reports" ON reports
    FOR DELETE USING (current_setting('role') = 'service_role');

-- Additional policies for public access (anonymous users before they create an account)
-- Allow anonymous users to insert initial user data (during assessment flow)
CREATE POLICY "Anonymous users can create initial user record" ON users
    FOR INSERT WITH CHECK (true);

-- Allow anonymous users to insert campaign data (during assessment flow)
CREATE POLICY "Anonymous users can create campaign record" ON campaigns
    FOR INSERT WITH CHECK (true);

-- Create a function to check if user owns the report through the user_id relationship
CREATE OR REPLACE FUNCTION user_owns_report(report_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN report_user_id = auth.uid()::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative policy for reports that allows users to view their reports even if created by service role
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT USING (user_owns_report(user_id));

-- Grant necessary permissions for the RLS policies to work
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon; 