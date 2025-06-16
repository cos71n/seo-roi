-- Create job queue table for managing background processing tasks

-- Job queue table
CREATE TABLE job_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(50) NOT NULL, -- 'report_generation', 'email_notification', etc.
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 0, -- Higher = processed first
    payload JSONB NOT NULL, -- Job-specific data (reportId, userId, etc.)
    result JSONB, -- Result data after completion
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Timing
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When job should be processed
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queue processing
CREATE INDEX idx_job_queue_status_priority ON job_queue(status, priority DESC, scheduled_for);
CREATE INDEX idx_job_queue_job_type ON job_queue(job_type);
CREATE INDEX idx_job_queue_created_at ON job_queue(created_at);

-- Dead letter queue for permanently failed jobs
CREATE TABLE job_queue_dead_letter (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_job_id UUID,
    job_type VARCHAR(50),
    payload JSONB,
    error_message TEXT,
    failed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    retry_count INTEGER
);

-- Function to move failed jobs to dead letter queue
CREATE OR REPLACE FUNCTION move_to_dead_letter_queue(job_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO job_queue_dead_letter (original_job_id, job_type, payload, error_message, retry_count)
    SELECT id, job_type, payload, error_message, retry_count
    FROM job_queue
    WHERE id = job_id AND status = 'failed' AND retry_count >= max_retries;
    
    DELETE FROM job_queue WHERE id = job_id AND status = 'failed' AND retry_count >= max_retries;
END;
$$ LANGUAGE plpgsql;

-- Function to enqueue a job
CREATE OR REPLACE FUNCTION enqueue_job(
    p_job_type VARCHAR,
    p_payload JSONB,
    p_priority INTEGER DEFAULT 0,
    p_scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_job_id UUID;
BEGIN
    INSERT INTO job_queue (job_type, payload, priority, scheduled_for, created_by)
    VALUES (p_job_type, p_payload, p_priority, p_scheduled_for, p_created_by)
    RETURNING id INTO v_job_id;
    
    RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to claim next available job for processing
CREATE OR REPLACE FUNCTION claim_next_job(p_job_types VARCHAR[] DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    job_type VARCHAR,
    payload JSONB,
    retry_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    UPDATE job_queue jq
    SET 
        status = 'processing',
        started_at = NOW(),
        retry_count = jq.retry_count + 1
    FROM (
        SELECT jq2.id
        FROM job_queue jq2
        WHERE 
            jq2.status IN ('pending', 'failed')
            AND jq2.scheduled_for <= NOW()
            AND jq2.retry_count < jq2.max_retries
            AND (p_job_types IS NULL OR jq2.job_type = ANY(p_job_types))
        ORDER BY jq2.priority DESC, jq2.scheduled_for
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    ) sub
    WHERE jq.id = sub.id
    RETURNING jq.id, jq.job_type, jq.payload, jq.retry_count;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a job
CREATE OR REPLACE FUNCTION complete_job(p_job_id UUID, p_result JSONB DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    UPDATE job_queue
    SET 
        status = 'completed',
        completed_at = NOW(),
        result = p_result
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to fail a job
CREATE OR REPLACE FUNCTION fail_job(p_job_id UUID, p_error_message TEXT)
RETURNS VOID AS $$
DECLARE
    v_retry_count INTEGER;
    v_max_retries INTEGER;
BEGIN
    SELECT retry_count, max_retries INTO v_retry_count, v_max_retries
    FROM job_queue
    WHERE id = p_job_id;
    
    IF v_retry_count >= v_max_retries THEN
        -- Move to dead letter queue
        PERFORM move_to_dead_letter_queue(p_job_id);
    ELSE
        -- Mark as failed, will be retried
        UPDATE job_queue
        SET 
            status = 'failed',
            error_message = p_error_message,
            scheduled_for = NOW() + INTERVAL '1 minute' * v_retry_count -- Exponential backoff
        WHERE id = p_job_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger
CREATE TRIGGER update_job_queue_updated_at BEFORE UPDATE ON job_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 