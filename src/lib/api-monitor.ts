import { supabase } from './supabase';

// Types for API monitoring
export interface APIUsageLog {
  id?: string;
  api_name: 'ahrefs' | 'claude' | 'openai';
  endpoint: string;
  request_count: number;
  success_count: number;
  error_count: number;
  total_response_time: number; // in milliseconds
  cache_hits: number;
  last_request_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface APIError {
  id?: string;
  api_name: 'ahrefs' | 'claude' | 'openai';
  endpoint: string;
  error_message: string;
  error_code?: string;
  request_data?: any;
  response_data?: any;
  occurred_at: string;
  created_at?: string;
}

export interface DailyAPIStats {
  date: string;
  api_name: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  cache_hit_rate: number;
  cost_estimate?: number;
}

class APIMonitor {
  private static instance: APIMonitor;
  private usageLogs: Map<string, APIUsageLog> = new Map();
  private errorLogs: APIError[] = [];
  private startTime: number = Date.now();

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): APIMonitor {
    if (!APIMonitor.instance) {
      APIMonitor.instance = new APIMonitor();
    }
    return APIMonitor.instance;
  }

  /**
   * Log a successful API request
   */
  logRequest(
    apiName: 'ahrefs' | 'claude' | 'openai',
    endpoint: string,
    responseTime: number,
    cacheHit: boolean = false
  ) {
    const key = `${apiName}_${endpoint}`;
    const existing = this.usageLogs.get(key);
    
    if (existing) {
      existing.request_count++;
      existing.success_count++;
      existing.total_response_time += responseTime;
      if (cacheHit) existing.cache_hits++;
      existing.last_request_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
    } else {
      const newLog: APIUsageLog = {
        api_name: apiName,
        endpoint,
        request_count: 1,
        success_count: 1,
        error_count: 0,
        total_response_time: responseTime,
        cache_hits: cacheHit ? 1 : 0,
        last_request_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.usageLogs.set(key, newLog);
    }

    // Periodically save to database
    this.maybePersistData();
  }

  /**
   * Log an API error
   */
  logError(
    apiName: 'ahrefs' | 'claude' | 'openai',
    endpoint: string,
    error: Error,
    requestData?: any,
    responseData?: any
  ) {
    const key = `${apiName}_${endpoint}`;
    const existing = this.usageLogs.get(key);
    
    if (existing) {
      existing.request_count++;
      existing.error_count++;
      existing.last_request_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
    } else {
      const newLog: APIUsageLog = {
        api_name: apiName,
        endpoint,
        request_count: 1,
        success_count: 0,
        error_count: 1,
        total_response_time: 0,
        cache_hits: 0,
        last_request_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.usageLogs.set(key, newLog);
    }

    // Log the specific error
    const errorLog: APIError = {
      api_name: apiName,
      endpoint,
      error_message: error.message,
      error_code: (error as any).code || (error as any).status?.toString(),
      request_data: requestData ? JSON.stringify(requestData).slice(0, 1000) : undefined,
      response_data: responseData ? JSON.stringify(responseData).slice(0, 1000) : undefined,
      occurred_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    this.errorLogs.push(errorLog);
    
    // Log to console for immediate visibility
    console.error(`API Error [${apiName}/${endpoint}]:`, error.message);

    this.maybePersistData();
  }

  /**
   * Get current usage statistics
   */
  getUsageStats() {
    const stats = {
      session_start: new Date(this.startTime).toISOString(),
      uptime_minutes: Math.round((Date.now() - this.startTime) / 60000),
      apis: {} as Record<string, any>
    };

    for (const [key, log] of this.usageLogs.entries()) {
      const apiName = log.api_name;
      if (!stats.apis[apiName]) {
        stats.apis[apiName] = {
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0,
          total_response_time: 0,
          cache_hits: 0,
          endpoints: {}
        };
      }

      stats.apis[apiName].total_requests += log.request_count;
      stats.apis[apiName].successful_requests += log.success_count;
      stats.apis[apiName].failed_requests += log.error_count;
      stats.apis[apiName].total_response_time += log.total_response_time;
      stats.apis[apiName].cache_hits += log.cache_hits;
      
      stats.apis[apiName].endpoints[log.endpoint] = {
        requests: log.request_count,
        success_rate: log.request_count > 0 ? (log.success_count / log.request_count) * 100 : 0,
        avg_response_time: log.success_count > 0 ? log.total_response_time / log.success_count : 0,
        cache_hit_rate: log.request_count > 0 ? (log.cache_hits / log.request_count) * 100 : 0,
        last_request: log.last_request_at
      };
    }

    // Calculate averages and rates
    for (const apiName in stats.apis) {
      const api = stats.apis[apiName];
      api.success_rate = api.total_requests > 0 ? (api.successful_requests / api.total_requests) * 100 : 0;
      api.cache_hit_rate = api.total_requests > 0 ? (api.cache_hits / api.total_requests) * 100 : 0;
      api.avg_response_time = api.successful_requests > 0 ? api.total_response_time / api.successful_requests : 0;
    }

    return stats;
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): APIError[] {
    return this.errorLogs
      .slice(-limit)
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  }

  /**
   * Get API health status
   */
  getHealthStatus() {
    const stats = this.getUsageStats();
    const health = {
      overall_status: 'healthy' as 'healthy' | 'degraded' | 'critical',
      apis: {} as Record<string, any>
    };

    for (const [apiName, apiStats] of Object.entries(stats.apis)) {
      const successRate = (apiStats as any).success_rate;
      const recentErrors = this.errorLogs.filter(
        error => error.api_name === apiName && 
        new Date(error.occurred_at).getTime() > Date.now() - 300000 // Last 5 minutes
      ).length;

      let status = 'healthy';
      if (successRate < 50 || recentErrors > 5) {
        status = 'critical';
      } else if (successRate < 80 || recentErrors > 2) {
        status = 'degraded';
      }

      health.apis[apiName] = {
        status,
        success_rate: successRate,
        recent_errors: recentErrors,
        total_requests: (apiStats as any).total_requests
      };

      // Update overall status
      if (status === 'critical') {
        health.overall_status = 'critical';
      } else if (status === 'degraded' && health.overall_status === 'healthy') {
        health.overall_status = 'degraded';
      }
    }

    return health;
  }

  /**
   * Estimate API costs based on usage
   */
  estimateCosts() {
    const costs = {
      ahrefs: 0,
      claude: 0,
      openai: 0,
      total: 0
    };

    // Ahrefs pricing (estimate based on plan)
    const ahrefsStats = this.usageLogs.get('ahrefs');
    if (ahrefsStats) {
      // Assume enterprise plan with per-request cost
      costs.ahrefs = (ahrefsStats.success_count * 0.10); // $0.10 per successful request estimate
    }

    // Claude pricing (based on tokens)
    for (const [key, log] of this.usageLogs.entries()) {
      if (log.api_name === 'claude') {
        // Estimate based on average tokens per request
        const estimatedTokens = log.success_count * 2000; // 2000 tokens average per request
        costs.claude += (estimatedTokens / 1000) * 0.015; // $0.015 per 1K tokens for Claude 3.5 Sonnet
      }
    }

    // OpenAI pricing (based on tokens)
    for (const [key, log] of this.usageLogs.entries()) {
      if (log.api_name === 'openai') {
        // Estimate based on average tokens per request
        const estimatedTokens = log.success_count * 1500; // 1500 tokens average per request
        costs.openai += (estimatedTokens / 1000) * 0.01; // $0.01 per 1K tokens for GPT-4 Turbo
      }
    }

    costs.total = costs.ahrefs + costs.claude + costs.openai;

    return {
      ...costs,
      currency: 'USD',
      period: 'current_session',
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Periodically persist data to database (non-blocking)
   */
  private async maybePersistData() {
    // Only persist every 10 requests or 5 minutes to avoid overwhelming the database
    const shouldPersist = 
      this.usageLogs.size % 10 === 0 || 
      this.errorLogs.length % 5 === 0 ||
      (Date.now() - this.startTime) % 300000 < 1000; // Every 5 minutes

    if (shouldPersist) {
      this.persistData().catch(error => {
        console.error('Failed to persist API monitoring data:', error);
      });
    }
  }

  /**
   * Persist monitoring data to database
   */
  private async persistData() {
    try {
      // Note: This would require creating monitoring tables in the database
      // For now, we'll just log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('API Usage Stats:', this.getUsageStats());
        console.log('Recent Errors:', this.getRecentErrors(5));
      }

      // In production, you would save to database:
      // await supabase.from('api_usage_logs').upsert(Array.from(this.usageLogs.values()));
      // await supabase.from('api_errors').insert(this.errorLogs.slice(-10));
      
    } catch (error) {
      console.error('Failed to persist monitoring data:', error);
    }
  }

  /**
   * Reset monitoring data (useful for testing)
   */
  reset() {
    this.usageLogs.clear();
    this.errorLogs.length = 0;
    this.startTime = Date.now();
  }

  /**
   * Create monitoring middleware for API clients
   */
  createMiddleware(apiName: 'ahrefs' | 'claude' | 'openai') {
    return {
      onRequest: (endpoint: string) => {
        return Date.now(); // Return start time
      },
      
      onSuccess: (endpoint: string, startTime: number, cacheHit: boolean = false) => {
        const responseTime = Date.now() - startTime;
        this.logRequest(apiName, endpoint, responseTime, cacheHit);
      },
      
      onError: (endpoint: string, startTime: number, error: Error, requestData?: any, responseData?: any) => {
        this.logError(apiName, endpoint, error, requestData, responseData);
      }
    };
  }
}

// Export singleton instance
export const apiMonitor = APIMonitor.getInstance();

// Export the class for testing
export { APIMonitor }; 