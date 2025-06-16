import axios, { AxiosInstance, AxiosError } from 'axios';
import pLimit from 'p-limit';
import pRetry from 'p-retry';
import NodeCache from 'node-cache';

// Types for Ahrefs API responses
export interface AhrefsDomainOverview {
  domain: string;
  domain_rating: number;
  ahrefs_rank: number;
  backlinks: number;
  referring_domains: number;
  organic_keywords: number;
  organic_traffic: number;
  organic_cost: number;
}

export interface AhrefsBacklink {
  url_from: string;
  url_to: string;
  domain_from: string;
  domain_rating_source: number;
  traffic_domain: number;
  link_type: string;
  nofollow: boolean;
  first_seen: string;
  last_seen: string;
}

export interface AhrefsKeywordData {
  keyword: string;
  volume: number;
  keyword_difficulty: number;
  cpc: number;
  updated_date: string;
  serp_overview: AhrefsSerpResult[];
}

export interface AhrefsSerpResult {
  domain: string;
  url: string;
  position: number;
  traffic: number;
  value: number;
}

export interface AhrefsCompetitor {
  domain: string;
  common_keywords: number;
  se_keywords: number;
  se_traffic: number;
  domain_rating: number;
}

// Cache instance with 1 hour TTL for most data
const cache = new NodeCache({ stdTTL: 3600 });

// Rate limiter: 60 requests per minute for Ahrefs API
const limit = pLimit(1); // Process one request at a time
const requestQueue: Array<() => Promise<any>> = [];
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests (60/min)

class AhrefsAPIClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.AHREFS_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('Ahrefs API key is required. Set AHREFS_API_KEY environment variable.');
    }

    this.client = axios.create({
      baseURL: 'https://apiv2.ahrefs.com',
      timeout: 30000, // 30 second timeout
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'SEO-ROI-Assessment-Tool/1.0'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          // Log API errors for monitoring
          console.error('Ahrefs API Error:', {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            url: error.config?.url
          });

          // Handle rate limiting
          if (error.response.status === 429) {
            throw new Error('Ahrefs API rate limit exceeded. Please try again later.');
          }

          // Handle quota exceeded
          if (error.response.status === 402) {
            throw new Error('Ahrefs API quota exceeded. Please check your account limits.');
          }

          // Handle authentication errors
          if (error.response.status === 401) {
            throw new Error('Ahrefs API authentication failed. Please check your API key.');
          }
        }

        throw error;
      }
    );
  }

  /**
   * Rate-limited request wrapper
   */
  private async makeRequest<T>(requestFn: () => Promise<T>, cacheKey?: string): Promise<T> {
    // Check cache first
    if (cacheKey) {
      const cached = cache.get<T>(cacheKey);
      if (cached) {
        console.log(`Ahrefs cache hit: ${cacheKey}`);
        return cached;
      }
    }

    return limit(async () => {
      // Ensure minimum interval between requests
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }

      lastRequestTime = Date.now();

      // Execute with retry logic
      const result = await pRetry(requestFn, {
        retries: 3,
        minTimeout: 2000,
        maxTimeout: 10000,
        factor: 2,
        onFailedAttempt: (error) => {
          console.log(`Ahrefs API attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        }
      });

      // Cache successful results
      if (cacheKey && result) {
        cache.set(cacheKey, result);
      }

      return result;
    });
  }

  /**
   * Get domain overview data including DR, backlinks, organic traffic
   */
  async getDomainOverview(domain: string): Promise<AhrefsDomainOverview> {
    const cacheKey = `domain_overview_${domain}`;
    
    return this.makeRequest(async () => {
      const response = await this.client.get('/domain-overview', {
        params: {
          target: domain,
          mode: 'domain'
        }
      });

      return response.data.domain;
    }, cacheKey);
  }

  /**
   * Get backlink data for domain analysis
   */
  async getBacklinks(domain: string, limit: number = 1000): Promise<AhrefsBacklink[]> {
    const cacheKey = `backlinks_${domain}_${limit}`;
    
    return this.makeRequest(async () => {
      const response = await this.client.get('/backlinks', {
        params: {
          target: domain,
          mode: 'domain',
          limit: limit,
          order_by: 'domain_rating_source:desc'
        }
      });

      return response.data.backlinks || [];
    }, cacheKey);
  }

  /**
   * Get authority backlinks (DR 20+, 1000+ traffic from target geos)
   */
  async getAuthorityBacklinks(domain: string): Promise<AhrefsBacklink[]> {
    const backlinks = await this.getBacklinks(domain, 2000);
    
    // Filter for authority links based on our criteria
    return backlinks.filter(link => 
      link.domain_rating_source >= 20 &&
      link.traffic_domain >= 1000 &&
      !link.nofollow
    );
  }

  /**
   * Get competitor domains based on keyword overlap
   */
  async getCompetitors(domain: string, limit: number = 10): Promise<AhrefsCompetitor[]> {
    const cacheKey = `competitors_${domain}_${limit}`;
    
    return this.makeRequest(async () => {
      const response = await this.client.get('/competing-domains', {
        params: {
          target: domain,
          mode: 'domain',
          limit: limit,
          order_by: 'common_keywords:desc'
        }
      });

      return response.data.domains || [];
    }, cacheKey);
  }

  /**
   * Get keyword data including volume, difficulty, and SERP results
   */
  async getKeywordData(keyword: string, country: string = 'US'): Promise<AhrefsKeywordData> {
    const cacheKey = `keyword_${keyword}_${country}`;
    
    return this.makeRequest(async () => {
      const response = await this.client.get('/keywords-explorer', {
        params: {
          keywords: keyword,
          country: country,
          include_serp_overview: true
        }
      });

      return response.data.keywords[0];
    }, cacheKey);
  }

  /**
   * Get organic keywords for a domain
   */
  async getOrganicKeywords(domain: string, limit: number = 1000): Promise<any[]> {
    const cacheKey = `organic_keywords_${domain}_${limit}`;
    
    return this.makeRequest(async () => {
      const response = await this.client.get('/organic-keywords', {
        params: {
          target: domain,
          mode: 'domain',
          limit: limit,
          order_by: 'traffic:desc'
        }
      });

      return response.data.keywords || [];
    }, cacheKey);
  }

  /**
   * Get referring domains data
   */
  async getReferringDomains(domain: string, limit: number = 1000): Promise<any[]> {
    const cacheKey = `referring_domains_${domain}_${limit}`;
    
    return this.makeRequest(async () => {
      const response = await this.client.get('/referring-domains', {
        params: {
          target: domain,
          mode: 'domain',
          limit: limit,
          order_by: 'domain_rating:desc'
        }
      });

      return response.data.refdomains || [];
    }, cacheKey);
  }

  /**
   * Analyze content gaps between domain and competitors
   */
  async analyzeContentGaps(domain: string, competitors: string[]): Promise<any> {
    const cacheKey = `content_gaps_${domain}_${competitors.join(',').slice(0, 50)}`;
    
    return this.makeRequest(async () => {
      const targetKeywords = await this.getOrganicKeywords(domain, 2000);
      const competitorAnalysis = await Promise.all(
        competitors.slice(0, 3).map(async (competitor) => {
          const keywords = await this.getOrganicKeywords(competitor, 2000);
          return { domain: competitor, keywords };
        })
      );

      // Analyze gaps (simplified version)
      const targetKeywordSet = new Set(targetKeywords.map(k => k.keyword));
      const gaps: any[] = [];

      competitorAnalysis.forEach(comp => {
        comp.keywords.forEach(keyword => {
          if (!targetKeywordSet.has(keyword.keyword) && keyword.traffic > 100) {
            gaps.push({
              keyword: keyword.keyword,
              competitor: comp.domain,
              traffic: keyword.traffic,
              opportunity_score: keyword.traffic * (keyword.position <= 10 ? 1 : 0.5)
            });
          }
        });
      });

      return gaps.sort((a, b) => b.opportunity_score - a.opportunity_score).slice(0, 50);
    }, cacheKey);
  }

  /**
   * Get current API usage statistics
   */
  getUsageStats() {
    return {
      cacheHits: cache.keys().length,
      pendingRequests: requestQueue.length,
      lastRequestTime: new Date(lastRequestTime).toISOString()
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    cache.flushAll();
  }
}

// Export singleton instance
export const ahrefsClient = new AhrefsAPIClient();

// Export the class for testing
export { AhrefsAPIClient }; 