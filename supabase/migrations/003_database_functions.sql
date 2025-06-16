-- SEO ROI Assessment Tool - Database Functions
-- This migration creates reusable database functions for common operations

-- Function to get user with their latest campaign and report
CREATE OR REPLACE FUNCTION get_user_with_latest_data(user_email VARCHAR)
RETURNS TABLE (
    user_id UUID,
    email VARCHAR,
    first_name VARCHAR,
    phone VARCHAR,
    domain VARCHAR,
    company_name VARCHAR,
    industry VARCHAR,
    user_created_at TIMESTAMP WITH TIME ZONE,
    campaign_id UUID,
    monthly_spend INTEGER,
    investment_duration INTEGER,
    target_keywords TEXT[],
    conversion_rate DECIMAL,
    close_rate DECIMAL,
    average_order_value DECIMAL,
    campaign_created_at TIMESTAMP WITH TIME ZONE,
    report_id UUID,
    overall_score DECIMAL,
    status VARCHAR,
    completed_at TIMESTAMP WITH TIME ZONE,
    report_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.first_name,
        u.phone,
        u.domain,
        u.company_name,
        u.industry,
        u.created_at,
        c.id,
        c.monthly_spend,
        c.investment_duration,
        c.target_keywords,
        c.conversion_rate,
        c.close_rate,
        c.average_order_value,
        c.created_at,
        r.id,
        r.overall_score,
        r.status,
        r.completed_at,
        r.created_at
    FROM users u
    LEFT JOIN campaigns c ON u.id = c.user_id
    LEFT JOIN reports r ON u.id = r.user_id
    WHERE u.email = user_email
    ORDER BY c.created_at DESC, r.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if domain already has a recent assessment
CREATE OR REPLACE FUNCTION domain_has_recent_assessment(domain_name VARCHAR, hours_threshold INTEGER DEFAULT 24)
RETURNS BOOLEAN AS $$
DECLARE
    recent_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO recent_count
    FROM users u
    JOIN reports r ON u.id = r.user_id
    WHERE u.domain = domain_name
    AND r.created_at > NOW() - INTERVAL '1 hour' * hours_threshold
    AND r.status IN ('completed', 'processing');
    
    RETURN recent_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get report statistics by date range
CREATE OR REPLACE FUNCTION get_report_statistics(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    total_reports BIGINT,
    completed_reports BIGINT,
    failed_reports BIGINT,
    processing_reports BIGINT,
    average_score DECIMAL,
    average_monthly_spend DECIMAL,
    completion_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_reports,
        COUNT(*) FILTER (WHERE r.status = 'completed') as completed_reports,
        COUNT(*) FILTER (WHERE r.status = 'failed') as failed_reports,
        COUNT(*) FILTER (WHERE r.status = 'processing') as processing_reports,
        AVG(r.overall_score) as average_score,
        AVG(c.monthly_spend) as average_monthly_spend,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(*) FILTER (WHERE r.status = 'completed'))::DECIMAL / COUNT(*) * 100
            ELSE 0
        END as completion_rate
    FROM reports r
    JOIN campaigns c ON r.user_id = c.user_id
    WHERE r.created_at BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top performing industries by average score
CREATE OR REPLACE FUNCTION get_industry_performance()
RETURNS TABLE (
    industry VARCHAR,
    report_count BIGINT,
    average_score DECIMAL,
    average_spend DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.industry,
        COUNT(r.id) as report_count,
        AVG(r.overall_score) as average_score,
        AVG(c.monthly_spend) as average_spend
    FROM users u
    JOIN reports r ON u.id = r.user_id
    JOIN campaigns c ON u.id = c.user_id
    WHERE u.industry IS NOT NULL
    AND r.status = 'completed'
    GROUP BY u.industry
    HAVING COUNT(r.id) >= 3 -- Only industries with at least 3 reports
    ORDER BY AVG(r.overall_score) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old failed reports (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_failed_reports(days_old INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM reports
    WHERE status = 'failed'
    AND created_at < NOW() - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update report status with error handling
CREATE OR REPLACE FUNCTION update_report_status(
    report_id UUID,
    new_status VARCHAR,
    error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Validate status
    IF new_status NOT IN ('processing', 'completed', 'failed', 'queued') THEN
        RAISE EXCEPTION 'Invalid status: %', new_status;
    END IF;
    
    UPDATE reports
    SET 
        status = new_status,
        completed_at = CASE WHEN new_status = 'completed' THEN NOW() ELSE completed_at END,
        analysis_data = CASE 
            WHEN error_message IS NOT NULL THEN 
                COALESCE(analysis_data, '{}'::jsonb) || jsonb_build_object('error', error_message)
            ELSE analysis_data
        END,
        updated_at = NOW()
    WHERE id = report_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get queue status (for monitoring)
CREATE OR REPLACE FUNCTION get_queue_status()
RETURNS TABLE (
    queued_reports BIGINT,
    processing_reports BIGINT,
    oldest_queued TIMESTAMP WITH TIME ZONE,
    average_processing_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status = 'queued') as queued_reports,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_reports,
        MIN(created_at) FILTER (WHERE status = 'queued') as oldest_queued,
        AVG(completed_at - created_at) FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL) as average_processing_time
    FROM reports
    WHERE created_at > NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's report history
CREATE OR REPLACE FUNCTION get_user_report_history(user_email VARCHAR)
RETURNS TABLE (
    report_id UUID,
    overall_score DECIMAL,
    status VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    monthly_spend INTEGER,
    pdf_url VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.overall_score,
        r.status,
        r.created_at,
        r.completed_at,
        c.monthly_spend,
        r.pdf_url
    FROM reports r
    JOIN users u ON r.user_id = u.id
    JOIN campaigns c ON u.id = c.user_id
    WHERE u.email = user_email
    ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 