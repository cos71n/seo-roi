import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookRequest {
  reportId?: string;
  userId?: string;
  type: 'lead_completed' | 'report_ready' | 'report_failed';
  config?: {
    url?: string;
    secret?: string;
    headers?: Record<string, string>;
    retryAttempts?: number;
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const webhookUrl = Deno.env.get('LEAD_WEBHOOK_URL')
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET')

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { reportId, userId, type, config } = await req.json() as WebhookRequest

    // Fetch necessary data based on webhook type
    let payload: any = null
    
    if (type === 'lead_completed' && reportId) {
      // Fetch complete data for lead completed webhook
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select(`
          *,
          campaign:campaigns(*),
          user:users(*)
        `)
        .eq('id', reportId)
        .single()

      if (reportError || !report) {
        throw new Error(`Failed to fetch report: ${reportError?.message}`)
      }

      // Build webhook payload
      const analysisData = report.analysis_data || {}
      const scores = analysisData.scores || {}
      
      payload = {
        email: report.user.email,
        firstName: report.user.first_name || '',
        lastName: report.user.last_name || '',
        phone: report.user.phone || '',
        
        companyName: report.user.company_name,
        domain: report.user.domain,
        industry: report.user.industry || 'unknown',
        
        monthlySpend: report.campaign.monthly_spend,
        investmentDuration: report.campaign.investment_duration,
        targetKeywords: report.campaign.target_keywords,
        totalInvestment: report.campaign.monthly_spend * report.campaign.investment_duration,
        
        conversionRate: report.campaign.conversion_rate,
        closeRate: report.campaign.close_rate,
        averageOrderValue: report.campaign.average_order_value,
        
        overallScore: report.overall_score || 0,
        scoreBreakdown: {
          authorityLinks: report.link_score || 0,
          authorityDomains: report.domain_score || 0,
          trafficGrowth: report.traffic_score || 0,
          rankings: report.ranking_score || 0,
          aiVisibility: report.ai_visibility_score || 0
        },
        performanceLevel: scores.overall?.performanceLevel || 'Unknown',
        redFlagsCount: scores.overall?.redFlags?.length || 0,
        topRecommendations: scores.overall?.recommendations?.slice(0, 3) || [],
        
        reportId: report.id,
        reportUrl: `${Deno.env.get('APP_URL')}/reports/${report.id}`,
        pdfUrl: report.pdf_url,
        completedAt: report.completed_at || new Date().toISOString(),
        
        source: 'seo-roi-assessment',
      }
    }

    if (!payload) {
      throw new Error('No payload generated for webhook type: ' + type)
    }

    // Determine webhook URL and secret
    const finalWebhookUrl = config?.url || webhookUrl
    const finalWebhookSecret = config?.secret || webhookSecret

    if (!finalWebhookUrl) {
      throw new Error('No webhook URL configured')
    }

    // Create webhook log
    const { data: webhookLog, error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        webhook_type: type,
        url: finalWebhookUrl,
        payload,
        status: 'pending',
        report_id: reportId,
        user_id: userId
      })
      .select()
      .single()

    if (logError) {
      console.error('Failed to create webhook log:', logError)
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Source': 'seo-roi-assessment',
      'X-Webhook-Version': '1.0',
      ...config?.headers
    }

    // Add signature if secret is provided
    if (finalWebhookSecret) {
      const encoder = new TextEncoder()
      const data = encoder.encode(JSON.stringify(payload))
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(finalWebhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      
      const signature = await crypto.subtle.sign('HMAC', key, data)
      headers['X-Webhook-Signature'] = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    }

    // Send webhook
    const webhookResponse = await fetch(finalWebhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event: 'assessment.' + type.replace('_', '.'),
        data: payload,
        timestamp: new Date().toISOString()
      })
    })

    const responseText = await webhookResponse.text()
    const success = webhookResponse.ok

    // Update webhook log
    if (webhookLog) {
      await supabase
        .from('webhook_logs')
        .update({
          status: success ? 'success' : 'failed',
          response_status: webhookResponse.status,
          response_body: responseText,
          completed_at: new Date().toISOString(),
          attempts: 1
        })
        .eq('id', webhookLog.id)
    }

    if (!success) {
      throw new Error(`Webhook failed with status ${webhookResponse.status}: ${responseText}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        webhookLogId: webhookLog?.id,
        status: webhookResponse.status 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 