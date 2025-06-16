-- Add processing_message field to reports table for real-time status updates

ALTER TABLE reports 
ADD COLUMN processing_message TEXT;

COMMENT ON COLUMN reports.processing_message IS 'Current processing status message shown to users'; 