import { AhrefsAPIClient } from '../lib/ahrefs';
import { ClaudeAPIClient } from '../lib/claude';
import { OpenAIAPIClient } from '../lib/openai';
import { APIMonitor } from '../lib/api-monitor';

// Mock environment variables
const mockEnv = {
  AHREFS_API_KEY: 'test-ahrefs-key',
  ANTHROPIC_API_KEY: 'test-claude-key',
  OPENAI_API_KEY: 'test-openai-key'
};

// Mock the API clients to avoid real API calls during testing
jest.mock('axios');
jest.mock('@anthropic-ai/sdk');
jest.mock('openai');

describe('API Clients', () => {
  
  describe('AhrefsAPIClient', () => {
    let client: AhrefsAPIClient;

    beforeEach(() => {
      // Set up environment variables
      process.env.AHREFS_API_KEY = mockEnv.AHREFS_API_KEY;
      client = new AhrefsAPIClient();
    });

    afterEach(() => {
      // Clean up
      delete process.env.AHREFS_API_KEY;
      client.clearCache();
    });

    test('should initialize with API key from environment', () => {
      expect(() => new AhrefsAPIClient()).not.toThrow();
    });

    test('should throw error when API key is missing', () => {
      delete process.env.AHREFS_API_KEY;
      expect(() => new AhrefsAPIClient()).toThrow('Ahrefs API key is required');
    });

    test('should have rate limiting configuration', () => {
      const stats = client.getUsageStats();
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('pendingRequests');
      expect(stats).toHaveProperty('lastRequestTime');
    });

    test('should filter authority backlinks correctly', async () => {
      // Mock the getBacklinks method
      const mockBacklinks = [
        {
          url_from: 'https://example.com/page1',
          url_to: 'https://testdomain.com',
          domain_from: 'example.com',
          domain_rating_source: 25,
          traffic_domain: 1500,
          link_type: 'redirect',
          nofollow: false,
          first_seen: '2024-01-01',
          last_seen: '2024-06-01'
        },
        {
          url_from: 'https://lowdr.com/page1',
          url_to: 'https://testdomain.com',
          domain_from: 'lowdr.com',
          domain_rating_source: 15, // Below threshold
          traffic_domain: 500, // Below threshold
          link_type: 'redirect',
          nofollow: false,
          first_seen: '2024-01-01',
          last_seen: '2024-06-01'
        },
        {
          url_from: 'https://nofollow.com/page1',
          url_to: 'https://testdomain.com',
          domain_from: 'nofollow.com',
          domain_rating_source: 30,
          traffic_domain: 2000,
          link_type: 'redirect',
          nofollow: true, // Should be filtered out
          first_seen: '2024-01-01',
          last_seen: '2024-06-01'
        }
      ];

      // Mock the getBacklinks method to return our test data
      jest.spyOn(client, 'getBacklinks').mockResolvedValue(mockBacklinks);

      const authorityLinks = await client.getAuthorityBacklinks('testdomain.com');
      
      // Should only return the first link (meets all criteria)
      expect(authorityLinks).toHaveLength(1);
      expect(authorityLinks[0].domain_from).toBe('example.com');
      expect(authorityLinks[0].domain_rating_source).toBeGreaterThanOrEqual(20);
      expect(authorityLinks[0].traffic_domain).toBeGreaterThanOrEqual(1000);
      expect(authorityLinks[0].nofollow).toBe(false);
    });
  });

  describe('ClaudeAPIClient', () => {
    let client: ClaudeAPIClient;

    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = mockEnv.ANTHROPIC_API_KEY;
      client = new ClaudeAPIClient();
    });

    afterEach(() => {
      delete process.env.ANTHROPIC_API_KEY;
      client.clearCache();
    });

    test('should initialize with API key from environment', () => {
      expect(() => new ClaudeAPIClient()).not.toThrow();
    });

    test('should throw error when API key is missing', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => new ClaudeAPIClient()).toThrow('Anthropic API key is required');
    });

    test('should parse commentary sections correctly', () => {
      const mockResponse = `
## Executive Summary
This is a test summary.

## Link Building Analysis
This is link building analysis.

## Action Plan
1. First action item
2. Second action item
`;

      // Access the private method for testing
      const parseMethod = (client as any).parseCommentary.bind(client);
      const result = parseMethod(mockResponse);

      expect(result.executiveSummary).toBe('This is a test summary.');
      expect(result.linkBuildingAnalysis).toBe('This is link building analysis.');
      expect(result.actionPlan).toContain('First action item');
    });

    test('should handle missing sections gracefully', () => {
      const mockResponse = `
## Executive Summary
This is a test summary.
`;

      const parseMethod = (client as any).parseCommentary.bind(client);
      const result = parseMethod(mockResponse);

      expect(result.executiveSummary).toBe('This is a test summary.');
      expect(result.linkBuildingAnalysis).toBe('Link building analysis not available.');
      expect(result.actionPlan).toBe('Action plan not available.');
    });

    test('should build analysis prompt correctly', () => {
      const request = {
        industry: 'Legal',
        domain: 'testlaw.com',
        companyName: 'Test Law Firm',
        monthlySpend: 2500,
        investmentDuration: 12,
        overallScore: 6.8,
        linkScore: 7.2,
        domainScore: 6.5,
        trafficScore: 7.0,
        rankingScore: 6.8,
        aiVisibilityScore: 5.9,
        authorityDomainGap: 25
      };

      const buildPromptMethod = (client as any).buildAnalysisPrompt.bind(client);
      const prompt = buildPromptMethod(request);

      expect(prompt).toContain('Legal business');
      expect(prompt).toContain('Test Law Firm');
      expect(prompt).toContain('testlaw.com');
      expect(prompt).toContain('$2,500');
      expect(prompt).toContain('6.8/10');
      expect(prompt).toContain('25 domains behind competitors');
    });

    test('should have usage statistics', () => {
      const stats = client.getUsageStats();
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('cacheSize');
    });
  });

  describe('OpenAIAPIClient', () => {
    let client: OpenAIAPIClient;

    beforeEach(() => {
      process.env.OPENAI_API_KEY = mockEnv.OPENAI_API_KEY;
      client = new OpenAIAPIClient();
    });

    afterEach(() => {
      delete process.env.OPENAI_API_KEY;
      client.clearCache();
    });

    test('should initialize with API key from environment', () => {
      expect(() => new OpenAIAPIClient()).not.toThrow();
    });

    test('should throw error when API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new OpenAIAPIClient()).toThrow('OpenAI API key is required');
    });

    test('should check mentions correctly', () => {
      const response = 'I recommend TestLaw Firm for legal services. They have great experience.';
      const domain = 'testlaw.com';
      const companyName = 'TestLaw Firm';

      const checkMethod = (client as any).checkIfMentioned.bind(client);
      const mentioned = checkMethod(response, domain, companyName);

      expect(mentioned).toBe(true);
    });

    test('should not find mentions when not present', () => {
      const response = 'I recommend Other Law Firm for legal services. They have great experience.';
      const domain = 'testlaw.com';
      const companyName = 'TestLaw Firm';

      const checkMethod = (client as any).checkIfMentioned.bind(client);
      const mentioned = checkMethod(response, domain, companyName);

      expect(mentioned).toBe(false);
    });

    test('should extract recommendations correctly', () => {
      const response = `
Here are some recommendations:
1. Company A - Great service
2. Company B - Excellent support
- Another Company
* Yet Another Company
`;

      const extractMethod = (client as any).extractRecommendations.bind(client);
      const recommendations = extractMethod(response);

      expect(recommendations).toContain('Company A');
      expect(recommendations).toContain('Company B');
      expect(recommendations).toContain('Another Company');
      expect(recommendations).toContain('Yet Another Company');
    });

    test('should build primary query with variation', () => {
      const test = {
        keyword: 'personal injury lawyer',
        domain: 'testlaw.com',
        companyName: 'Test Law Firm',
        location: 'New York'
      };

      const buildMethod = (client as any).buildPrimaryQuery.bind(client);
      const query = buildMethod(test);

      expect(query).toContain('personal injury lawyer');
      expect(query).toContain('New York');
      expect(query.length).toBeGreaterThan(20);
    });

    test('should calculate overall analysis correctly', () => {
      const results = [
        { keyword: 'keyword1', mentioned: true, score: 20, brandRecognition: true, context: '', recommendations: [] },
        { keyword: 'keyword2', mentioned: false, score: 0, brandRecognition: false, context: '', recommendations: [] },
        { keyword: 'keyword3', mentioned: true, score: 15, brandRecognition: true, context: '', recommendations: [] }
      ];

      const calculateMethod = (client as any).calculateOverallAnalysis.bind(client);
      const analysis = calculateMethod('testlaw.com', ['keyword1', 'keyword2', 'keyword3'], results);

      expect(analysis.overallScore).toBeCloseTo(5.8, 1); // (20+0+15)/(3*20)*10
      expect(analysis.brandRecognitionScore).toBeCloseTo(6.7, 1); // 2/3*10
      expect(analysis.recommendationScore).toBeCloseTo(6.7, 1); // 2/3*10
      expect(analysis.insights).toContain('Moderate AI visibility');
    });

    test('should have usage statistics', () => {
      const stats = client.getUsageStats();
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('lastRequestTime');
      expect(stats).toHaveProperty('rateLimitInterval');
    });
  });

  describe('APIMonitor', () => {
    let monitor: APIMonitor;

    beforeEach(() => {
      monitor = APIMonitor.getInstance();
      monitor.reset(); // Clear any previous data
    });

    test('should be a singleton', () => {
      const monitor1 = APIMonitor.getInstance();
      const monitor2 = APIMonitor.getInstance();
      expect(monitor1).toBe(monitor2);
    });

    test('should log successful requests', () => {
      monitor.logRequest('ahrefs', '/domain-overview', 1500, false);
      monitor.logRequest('ahrefs', '/domain-overview', 1200, true);

      const stats = monitor.getUsageStats();
      expect(stats.apis.ahrefs.total_requests).toBe(2);
      expect(stats.apis.ahrefs.successful_requests).toBe(2);
      expect(stats.apis.ahrefs.failed_requests).toBe(0);
      expect(stats.apis.ahrefs.cache_hits).toBe(1);
    });

    test('should log errors', () => {
      const error = new Error('API rate limit exceeded');
      monitor.logError('claude', '/messages', error, { test: 'data' });

      const stats = monitor.getUsageStats();
      expect(stats.apis.claude.total_requests).toBe(1);
      expect(stats.apis.claude.successful_requests).toBe(0);
      expect(stats.apis.claude.failed_requests).toBe(1);

      const errors = monitor.getRecentErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].error_message).toBe('API rate limit exceeded');
      expect(errors[0].api_name).toBe('claude');
    });

    test('should calculate health status correctly', () => {
      // Add some successful requests
      monitor.logRequest('ahrefs', '/test', 1000);
      monitor.logRequest('ahrefs', '/test', 1000);
      
      // Add some errors
      monitor.logError('openai', '/test', new Error('Test error'));

      const health = monitor.getHealthStatus();
      expect(health.overall_status).toBe('healthy'); // Should be healthy overall
      expect(health.apis.ahrefs.status).toBe('healthy');
      expect(health.apis.openai.status).toBe('degraded'); // 100% error rate
    });

    test('should estimate costs correctly', () => {
      monitor.logRequest('ahrefs', '/test', 1000);
      monitor.logRequest('claude', '/messages', 2000);
      monitor.logRequest('openai', '/chat', 1500);

      const costs = monitor.estimateCosts();
      expect(costs.ahrefs).toBeGreaterThan(0);
      expect(costs.claude).toBeGreaterThan(0);
      expect(costs.openai).toBeGreaterThan(0);
      expect(costs.total).toBe(costs.ahrefs + costs.claude + costs.openai);
      expect(costs.currency).toBe('USD');
    });

    test('should create middleware correctly', () => {
      const middleware = monitor.createMiddleware('ahrefs');
      
      expect(middleware).toHaveProperty('onRequest');
      expect(middleware).toHaveProperty('onSuccess');
      expect(middleware).toHaveProperty('onError');
      
      const startTime = middleware.onRequest('/test');
      expect(typeof startTime).toBe('number');
      
      // Test success callback
      middleware.onSuccess('/test', startTime, false);
      const stats = monitor.getUsageStats();
      expect(stats.apis.ahrefs.total_requests).toBe(1);
      
      // Test error callback
      middleware.onError('/test2', Date.now(), new Error('Test error'));
      const updatedStats = monitor.getUsageStats();
      expect(updatedStats.apis.ahrefs.failed_requests).toBe(1);
    });

    test('should reset data correctly', () => {
      monitor.logRequest('ahrefs', '/test', 1000);
      monitor.logError('claude', '/test', new Error('Test'));
      
      let stats = monitor.getUsageStats();
      expect(stats.apis.ahrefs.total_requests).toBe(1);
      
      monitor.reset();
      
      stats = monitor.getUsageStats();
      expect(Object.keys(stats.apis)).toHaveLength(0);
      expect(monitor.getRecentErrors()).toHaveLength(0);
    });
  });

  describe('Integration', () => {
    test('should work together - API clients with monitoring', () => {
      const monitor = APIMonitor.getInstance();
      monitor.reset();
      
      const middleware = monitor.createMiddleware('ahrefs');
      
      // Simulate API request lifecycle
      const startTime = middleware.onRequest('/domain-overview');
      
      // Simulate successful response
      setTimeout(() => {
        middleware.onSuccess('/domain-overview', startTime, false);
      }, 100);
      
      // Verify monitoring
      setTimeout(() => {
        const stats = monitor.getUsageStats();
        expect(stats.apis.ahrefs.total_requests).toBe(1);
        expect(stats.apis.ahrefs.successful_requests).toBe(1);
      }, 200);
    });

    test('should handle error scenarios correctly', () => {
      const monitor = APIMonitor.getInstance();
      monitor.reset();
      
      const middleware = monitor.createMiddleware('claude');
      
      // Simulate API error
      const error = new Error('Authentication failed');
      middleware.onError('/messages', Date.now(), error);
      
      const health = monitor.getHealthStatus();
      expect(health.apis.claude.status).toBe('degraded');
      expect(health.apis.claude.recent_errors).toBe(1);
    });
  });

}); 