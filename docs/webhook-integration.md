# Webhook Integration Guide

## Overview

The SEO ROI Assessment tool supports webhook integration to send lead and assessment data to external services like Bento, Pipedrive, or any other CRM/marketing automation platform. This enables real-time lead capture and automation workflows.

## Webhook Events

### 1. `assessment.completed`
Triggered when a user completes the entire assessment flow including the lead gate form.

## Webhook Payload

The webhook sends a POST request with the following JSON structure:

```json
{
  "event": "assessment.completed",
  "timestamp": "2024-01-20T10:30:00Z",
  "data": {
    // Lead Information
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    
    // Company Information
    "companyName": "Example Corp",
    "domain": "example.com",
    "industry": "technology",
    
    // SEO Investment Details
    "monthlySpend": 5000,
    "investmentDuration": 12,
    "targetKeywords": ["seo services", "digital marketing"],
    "totalInvestment": 60000,
    
    // Conversion Metrics (if provided)
    "conversionRate": 2.5,
    "closeRate": 20,
    "averageOrderValue": 1000,
    "estimatedMonthlyValue": 5000,
    
    // Assessment Results
    "overallScore": 7.5,
    "scoreBreakdown": {
      "authorityLinks": 8.2,
      "authorityDomains": 7.1,
      "trafficGrowth": 6.8,
      "rankings": 7.9,
      "aiVisibility": 7.5
    },
    "performanceLevel": "Good",
    "redFlagsCount": 2,
    "topRecommendations": [
      "Increase link building from high-authority domains",
      "Improve content targeting for AI search visibility",
      "Expand keyword targeting to capture more traffic"
    ],
    
    // Report Details
    "reportId": "550e8400-e29b-41d4-a716-446655440000",
    "reportUrl": "https://app.example.com/reports/550e8400-e29b-41d4-a716-446655440000",
    "pdfUrl": "https://storage.example.com/reports/report-550e8400.pdf",
    "completedAt": "2024-01-20T10:28:00Z",
    
    // Metadata
    "source": "seo-roi-assessment",
    "campaign": "january-promo",
    "referrer": "https://blog.example.com/seo-guide"
  }
}
```

## Configuration

### 1. Environment Variables

Set the following environment variables:

```bash
# Required: Your webhook endpoint URL
NEXT_PUBLIC_LEAD_WEBHOOK_URL=https://your-webhook-endpoint.com/webhooks/seo-assessment

# Optional: Secret for HMAC signature verification
WEBHOOK_SECRET=your-secret-key
```

### 2. Headers

All webhook requests include these headers:

- `Content-Type: application/json`
- `X-Webhook-Source: seo-roi-assessment`
- `X-Webhook-Version: 1.0`
- `X-Webhook-Signature: [HMAC-SHA256 signature]` (if secret is configured)

### 3. Signature Verification

If `WEBHOOK_SECRET` is set, the webhook includes an HMAC-SHA256 signature in the `X-Webhook-Signature` header. Verify it using:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}
```

## Integration Examples

### Zapier Integration

1. Create a new Zap with "Webhooks by Zapier" as the trigger
2. Choose "Catch Hook" as the trigger event
3. Copy the webhook URL provided by Zapier
4. Set `NEXT_PUBLIC_LEAD_WEBHOOK_URL` to the Zapier webhook URL
5. Test the webhook and map fields to your desired actions

### Make.com (Integromat) Integration

1. Create a new scenario with "Webhooks" module
2. Add a "Custom webhook" trigger
3. Copy the webhook URL
4. Set `NEXT_PUBLIC_LEAD_WEBHOOK_URL` to the Make.com webhook URL
5. Process the data and connect to your desired services

### Direct Integration

```javascript
// Example Express.js webhook handler
app.post('/webhooks/seo-assessment', (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'assessment.completed') {
    // Process the lead data
    const lead = {
      email: data.email,
      name: `${data.firstName} ${data.lastName}`,
      phone: data.phone,
      company: data.companyName,
      customFields: {
        seoScore: data.overallScore,
        monthlySpend: data.monthlySpend,
        domain: data.domain
      }
    };
    
    // Send to your CRM
    crm.createLead(lead);
    
    // Send to email marketing
    emailService.addSubscriber({
      email: data.email,
      tags: ['seo-assessment', `score-${Math.floor(data.overallScore)}`],
      customFields: {
        reportUrl: data.reportUrl
      }
    });
  }
  
  res.status(200).send('OK');
});
```

## Error Handling

- Webhooks have automatic retry logic (3 attempts by default)
- Failed webhooks are logged in the database
- Retry delays: 5 seconds between attempts
- All webhook attempts are logged for debugging

## Monitoring

View webhook logs in the database:

```sql
-- View recent webhook attempts
SELECT * FROM webhook_logs 
ORDER BY created_at DESC 
LIMIT 100;

-- Check failed webhooks
SELECT * FROM webhook_logs 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '24 hours';

-- Webhook success rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM webhook_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

## Security Best Practices

1. **Always use HTTPS** for webhook endpoints
2. **Verify signatures** when WEBHOOK_SECRET is configured
3. **Validate payload structure** before processing
4. **Implement rate limiting** on your webhook endpoint
5. **Log all webhook activity** for audit trails
6. **Use IP allowlisting** if your webhook service supports it

## Testing

Test webhooks using tools like:

- [Webhook.site](https://webhook.site) - Free webhook testing
- [RequestBin](https://requestbin.com) - Inspect webhook payloads
- [ngrok](https://ngrok.com) - Test local webhook handlers

Example test with curl:

```bash
curl -X POST https://your-app.com/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "reportId": "test-report-id",
    "type": "lead_completed"
  }'
```

## Troubleshooting

### Webhook not firing
- Check environment variable is set correctly
- Verify webhook URL is accessible (not behind auth)
- Check browser console for errors

### Webhook failing
- Check webhook logs in database
- Verify endpoint returns 2xx status code
- Check payload size (should be <1MB)
- Ensure endpoint responds within 30 seconds

### Signature verification failing
- Ensure same secret on both sides
- Check for trailing newlines in secret
- Verify signature algorithm (HMAC-SHA256) 