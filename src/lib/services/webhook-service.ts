import { supabase } from './job-queue';

export interface WebhookPayload {
  // Lead Information
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  
  // Company Information
  companyName: string;
  domain: string;
  industry: string;
  
  // SEO Investment Details
  monthlySpend: number;
  investmentDuration: number;
  targetKeywords: string[];
  totalInvestment: number;
  
  // Conversion Metrics (if provided)
  conversionRate?: number;
  closeRate?: number;
  averageOrderValue?: number;
  estimatedMonthlyValue?: number;
  
  // Assessment Results
  overallScore: number;
  scoreBreakdown: {
    authorityLinks: number;
    authorityDomains: number;
    trafficGrowth: number;
    rankings: number;
    aiVisibility: number;
  };
  performanceLevel: string;
  redFlagsCount: number;
  topRecommendations: string[];
  
  // Report Details
  reportId: string;
  reportUrl: string;
  pdfUrl?: string;
  completedAt: string;
  
  // Metadata
  source: string;
  campaign?: string;
  referrer?: string;
}

export interface WebhookConfig {
  url?: string;
  secret?: string;
  headers?: Record<string, string>;
  retryAttempts?: number;
}

export class WebhookService {
  /**
   * Send webhook with lead and assessment data
   */
  static async sendLeadWebhook(payload: WebhookPayload, config?: WebhookConfig) {
    // Get webhook URL from environment or use provided config
    const webhookUrl = config?.url || process.env.NEXT_PUBLIC_LEAD_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn('No webhook URL configured, skipping webhook');
      return { success: false, error: 'No webhook URL configured' };
    }

    try {
      // Create webhook record in database
      const { data: webhook, error: dbError } = await supabase
        .from('webhook_logs')
        .insert({
          webhook_type: 'lead_completed',
          payload,
          url: webhookUrl,
          status: 'pending'
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error creating webhook log:', dbError);
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Source': 'seo-roi-assessment',
        'X-Webhook-Version': '1.0',
        ...config?.headers
      };

      // Add signature if secret is provided
      if (config?.secret) {
        const signature = await this.generateSignature(payload, config.secret);
        headers['X-Webhook-Signature'] = signature;
      }

      // Send webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: 'assessment.completed',
          data: payload,
          timestamp: new Date().toISOString()
        })
      });

      const success = response.ok;
      const responseData = await response.text();

      // Update webhook log
      if (webhook) {
        await supabase
          .from('webhook_logs')
          .update({
            status: success ? 'success' : 'failed',
            response_status: response.status,
            response_body: responseData,
            completed_at: new Date().toISOString()
          })
          .eq('id', webhook.id);
      }

      if (!success) {
        console.error('Webhook failed:', response.status, responseData);
        
        // Retry logic
        if (config?.retryAttempts && config.retryAttempts > 0) {
          const remainingAttempts = config.retryAttempts - 1;
          console.log(`Retrying webhook in 5 seconds... (${remainingAttempts} attempts remaining)`);
          setTimeout(() => {
            this.sendLeadWebhook(payload, {
              ...config,
              retryAttempts: remainingAttempts
            });
          }, 5000);
        }
      }

      return { success, status: response.status, data: responseData };

    } catch (error) {
      console.error('Error sending webhook:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Generate HMAC signature for webhook security
   */
  private static async generateSignature(payload: any, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    const key = encoder.encode(secret);
    
    // In browser environment, use SubtleCrypto
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
      return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    
    // Fallback for Node.js environment
    // This would need the crypto module in a server environment
    console.warn('Signature generation not available in this environment');
    return '';
  }

  /**
   * Build webhook payload from assessment data
   */
  static buildPayload(data: {
    user: any;
    campaign: any;
    report: any;
    leadData: { firstName: string; lastName: string; phone: string };
  }): WebhookPayload {
    const { user, campaign, report, leadData } = data;
    const analysisData = report.analysis_data || {};
    const scores = analysisData.scores || {};

    // Calculate estimated monthly value
    let estimatedMonthlyValue: number | undefined;
    if (campaign.conversion_rate && campaign.close_rate && campaign.average_order_value) {
      // Estimate based on potential traffic improvement
      const estimatedTraffic = 1000; // Base estimate
      const conversions = estimatedTraffic * (campaign.conversion_rate / 100);
      const sales = conversions * (campaign.close_rate / 100);
      estimatedMonthlyValue = sales * campaign.average_order_value;
    }

    return {
      // Lead Information
      email: user.email,
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      phone: leadData.phone,
      
      // Company Information
      companyName: user.company_name,
      domain: user.domain,
      industry: user.industry || 'unknown',
      
      // SEO Investment Details
      monthlySpend: campaign.monthly_spend,
      investmentDuration: campaign.investment_duration,
      targetKeywords: campaign.target_keywords,
      totalInvestment: campaign.monthly_spend * campaign.investment_duration,
      
      // Conversion Metrics
      conversionRate: campaign.conversion_rate,
      closeRate: campaign.close_rate,
      averageOrderValue: campaign.average_order_value,
      estimatedMonthlyValue,
      
      // Assessment Results
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
      
      // Report Details
      reportId: report.id,
      reportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reports/${report.id}`,
      pdfUrl: report.pdf_url,
      completedAt: report.completed_at || new Date().toISOString(),
      
      // Metadata
      source: 'seo-roi-assessment',
      campaign: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('utm_campaign') || undefined : undefined,
      referrer: typeof window !== 'undefined' ? document.referrer || undefined : undefined
    };
  }

  /**
   * Get webhook logs for monitoring
   */
  static async getWebhookLogs(filters?: {
    status?: 'pending' | 'success' | 'failed';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    let query = supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching webhook logs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Retry failed webhooks
   */
  static async retryFailedWebhooks(since?: Date) {
    const logs = await this.getWebhookLogs({
      status: 'failed',
      startDate: since || new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    });

    const results = await Promise.all(
      logs.map(log => this.sendLeadWebhook(log.payload, {
        url: log.url,
        retryAttempts: 1
      }))
    );

    return {
      total: logs.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  }
} 