-- Create webhook logs table for tracking webhook deliveries

CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_type VARCHAR(50) NOT NULL, -- 'lead_completed', 'report_ready', etc.
    url TEXT NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    attempts INTEGER DEFAULT 0,
    
    -- Response data
    response_status INTEGER,
    response_body TEXT,
    response_headers JSONB,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Reference to the report/user
    report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for efficient querying
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_webhook_type ON webhook_logs(webhook_type);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);
CREATE INDEX idx_webhook_logs_report_id ON webhook_logs(report_id);
CREATE INDEX idx_webhook_logs_user_id ON webhook_logs(user_id);

-- Create webhook configurations table (for future use)
CREATE TABLE webhook_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    secret TEXT, -- For HMAC signatures
    headers JSONB, -- Additional headers to include
    events TEXT[] NOT NULL, -- Which events to send
    active BOOLEAN DEFAULT TRUE,
    
    -- Rate limiting
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 300, -- 5 minutes
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id)
);

-- Apply updated_at trigger
CREATE TRIGGER update_webhook_configs_updated_at 
    BEFORE UPDATE ON webhook_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE webhook_logs IS 'Log of all webhook deliveries for monitoring and retry';
COMMENT ON TABLE webhook_configs IS 'Webhook endpoint configurations for different services';
COMMENT ON COLUMN webhook_logs.payload IS 'The complete data sent in the webhook request';
COMMENT ON COLUMN webhook_configs.secret IS 'Secret key for HMAC signature generation'; 