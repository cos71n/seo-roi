# Supabase Edge Functions Documentation

This directory contains the Edge Functions for background processing in the SEO ROI Assessment tool.

## Functions Overview

### 1. `process-report`
Direct report processing function (deprecated in favor of job-processor).

### 2. `job-processor`
Main background job processor that:
- Claims jobs from the queue
- Processes report generation
- Handles retries and failures
- Updates job and report statuses

## Deployment

### Prerequisites

1. Install Supabase CLI:
```bash
brew install supabase/tap/supabase
```

2. Link to your Supabase project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Deploy Functions

Deploy all functions:
```bash
supabase functions deploy
```

Deploy a specific function:
```bash
supabase functions deploy job-processor
```

### Environment Variables

Set the following secrets for the Edge Functions:

```bash
# Required Supabase variables (automatically set)
# SUPABASE_URL
# SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY

# External API keys
supabase secrets set AHREFS_API_KEY=your_ahrefs_key
supabase secrets set CLAUDE_API_KEY=your_claude_key
supabase secrets set OPENAI_API_KEY=your_openai_key

# Processing configuration
supabase secrets set MAX_RETRIES=3
supabase secrets set PROCESSING_TIMEOUT_SECONDS=300
```

## Job Queue System

### How It Works

1. **Job Creation**: When a user completes the assessment form, a job is created in the `job_queue` table
2. **Job Processing**: The `job-processor` function claims and processes jobs
3. **Status Updates**: Jobs progress through statuses: `pending` → `processing` → `completed`/`failed`
4. **Retry Logic**: Failed jobs are retried with exponential backoff
5. **Dead Letter Queue**: Jobs that fail after max retries are moved to `job_queue_dead_letter`

### Job Types

- `report_generation`: Generates SEO assessment reports

### Priority System

Jobs can have different priorities (higher number = higher priority):
- 0: Standard priority (default)
- 1: Premium users
- 2: High-value leads ($5000+ monthly spend)
- 3: Urgent/manual requests

## Scheduling

The job processor needs to be triggered periodically. Options:

### 1. Cron Job (Recommended)

Set up a cron job to trigger the processor every minute:

```javascript
// In your backend or a separate cron service
const triggerJobProcessor = async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/job-processor`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
};

// Run every minute
setInterval(triggerJobProcessor, 60000);
```

### 2. Supabase Database Webhooks

Create a database webhook that triggers on job insertions:

```sql
-- Create webhook (via Supabase dashboard)
-- URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/job-processor
-- Events: INSERT on job_queue table
```

### 3. Manual Trigger

For testing or manual processing:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/job-processor \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Monitoring

### Check Function Logs

```bash
supabase functions logs job-processor --tail
```

### Queue Health Check

Use the `QueueMonitor` service in the application:

```typescript
import { QueueMonitor } from '@/lib/services/queue-monitor';

// Get queue statistics
const stats = await QueueMonitor.getQueueStats('hour');

// Check queue health
const { healthy, alerts } = await QueueMonitor.checkQueueHealth();

// Get stuck jobs
const stuckJobs = await QueueMonitor.getStuckJobs(10);
```

### Database Queries

Monitor the queue directly:

```sql
-- View pending jobs
SELECT * FROM job_queue WHERE status = 'pending' ORDER BY priority DESC, created_at;

-- View failed jobs
SELECT * FROM job_queue WHERE status = 'failed' AND retry_count >= max_retries;

-- View processing times
SELECT 
  job_type,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_seconds,
  COUNT(*) as total_jobs
FROM job_queue 
WHERE status = 'completed' 
  AND completed_at IS NOT NULL 
  AND started_at IS NOT NULL
GROUP BY job_type;

-- View dead letter queue
SELECT * FROM job_queue_dead_letter ORDER BY failed_at DESC;
```

## Troubleshooting

### Common Issues

1. **Jobs stuck in processing**
   - Check function logs for errors
   - Look for timeout issues
   - Verify API keys are set correctly

2. **High failure rate**
   - Check external API limits
   - Verify database connections
   - Review error messages in failed jobs

3. **Slow processing**
   - Monitor API response times
   - Check for rate limiting
   - Consider increasing parallel processing

### Manual Intervention

```sql
-- Reset a stuck job
UPDATE job_queue 
SET status = 'pending', retry_count = 0 
WHERE id = 'job-id-here';

-- Move failed job back to pending
UPDATE job_queue 
SET status = 'pending', error_message = NULL 
WHERE id = 'job-id-here';

-- Cancel a job
UPDATE job_queue 
SET status = 'cancelled' 
WHERE id = 'job-id-here';
```

## Development

### Local Testing

1. Start local Supabase:
```bash
supabase start
```

2. Serve functions locally:
```bash
supabase functions serve job-processor --env-file ./supabase/functions/.env.local
```

3. Test with curl:
```bash
curl -X POST http://localhost:54321/functions/v1/job-processor \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Adding New Job Types

1. Update the `job-processor/index.ts` switch statement
2. Create a new processing function
3. Update TypeScript types in the application
4. Add appropriate database indexes if needed

## Performance Optimization

1. **Batch Processing**: Process multiple jobs in parallel when possible
2. **Caching**: Cache API responses to reduce external calls
3. **Connection Pooling**: Reuse database connections
4. **Timeout Management**: Set appropriate timeouts for long-running operations

## Security Considerations

1. Always use service role key for admin operations
2. Validate job payloads before processing
3. Implement rate limiting for job creation
4. Monitor for suspicious activity
5. Regularly rotate API keys 