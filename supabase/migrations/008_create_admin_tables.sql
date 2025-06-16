-- Create admin tables for user management and audit logging

-- Admin users table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'super_admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id)
);

-- Audit logs table for tracking admin actions
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL,
    data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add regeneration tracking fields to reports table
ALTER TABLE reports 
ADD COLUMN regenerated_by UUID REFERENCES admin_users(id),
ADD COLUMN regenerated_at TIMESTAMP WITH TIME ZONE;

-- Create indexes
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_email ON admin_users(email);

CREATE INDEX idx_audit_logs_admin_user_id ON audit_logs(admin_user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Comments
COMMENT ON TABLE admin_users IS 'Admin users with elevated privileges';
COMMENT ON TABLE audit_logs IS 'Audit trail of all admin actions';
COMMENT ON COLUMN reports.regenerated_by IS 'Admin who initiated report regeneration';
COMMENT ON COLUMN reports.regenerated_at IS 'Timestamp of last regeneration'; 