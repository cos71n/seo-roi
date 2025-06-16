-- Add processing-related fields to reports table for better job tracking

-- Add processing timestamps
ALTER TABLE reports 
ADD COLUMN processing_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN processing_completed_at TIMESTAMP WITH TIME ZONE;

-- Add error tracking
ALTER TABLE reports
ADD COLUMN error_message TEXT,
ADD COLUMN retry_count INTEGER DEFAULT 0;

-- Add priority for queue handling
ALTER TABLE reports
ADD COLUMN priority INTEGER DEFAULT 0; -- Higher priority = processed first

-- Add campaign reference
ALTER TABLE reports
ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE;

-- Create index for priority-based queue processing
CREATE INDEX idx_reports_priority_status ON reports(priority DESC, status, created_at);

-- Create index for processing timestamps
CREATE INDEX idx_reports_processing_started_at ON reports(processing_started_at);

-- Add comments for documentation
COMMENT ON COLUMN reports.processing_started_at IS 'Timestamp when report processing began';
COMMENT ON COLUMN reports.processing_completed_at IS 'Timestamp when report processing completed';
COMMENT ON COLUMN reports.error_message IS 'Error message if processing failed';
COMMENT ON COLUMN reports.retry_count IS 'Number of times processing has been retried';
COMMENT ON COLUMN reports.priority IS 'Processing priority (higher = processed first)';
COMMENT ON COLUMN reports.campaign_id IS 'Reference to the campaign being analyzed'; 