-- SEO ROI Assessment Tool - Initial Schema Migration
-- This migration creates the core tables for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - stores user information and contact details
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    phone VARCHAR(50),
    domain VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    industry VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns table - stores SEO campaign data and metrics
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    monthly_spend INTEGER NOT NULL CHECK (monthly_spend >= 1000), -- Minimum $1000/month
    investment_duration INTEGER NOT NULL CHECK (investment_duration >= 6), -- Minimum 6 months
    target_keywords TEXT[] NOT NULL CHECK (array_length(target_keywords, 1) <= 5), -- Max 5 keywords
    conversion_rate DECIMAL(5,2) CHECK (conversion_rate >= 0 AND conversion_rate <= 100),
    close_rate DECIMAL(5,2) CHECK (close_rate >= 0 AND close_rate <= 100),
    average_order_value DECIMAL(10,2) CHECK (average_order_value >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports table - stores generated assessment reports and scores
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Scoring metrics (1-10 scale)
    overall_score DECIMAL(3,1) CHECK (overall_score >= 1 AND overall_score <= 10),
    link_score DECIMAL(3,1) CHECK (link_score >= 1 AND link_score <= 10),
    domain_score DECIMAL(3,1) CHECK (domain_score >= 1 AND domain_score <= 10),
    traffic_score DECIMAL(3,1) CHECK (traffic_score >= 1 AND traffic_score <= 10),
    ranking_score DECIMAL(3,1) CHECK (ranking_score >= 1 AND ranking_score <= 10),
    ai_visibility_score DECIMAL(3,1) CHECK (ai_visibility_score >= 1 AND ai_visibility_score <= 10),
    
    -- Analysis data
    authority_domain_gap INTEGER,
    ai_visibility_data JSONB, -- Stores ChatGPT test results
    analysis_data JSONB, -- Stores all analysis results (competitor data, gaps, etc.)
    ai_commentary TEXT, -- Generated commentary from Claude
    
    -- Report management
    pdf_url VARCHAR(500), -- URL to generated PDF in Supabase Storage
    status VARCHAR(50) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'queued')),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_domain ON users(domain);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_monthly_spend ON campaigns(monthly_spend);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at);

CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at);
CREATE INDEX idx_reports_completed_at ON reports(completed_at);
CREATE INDEX idx_reports_overall_score ON reports(overall_score);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 