import OpenAI from 'openai';
import pLimit from 'p-limit';
import pRetry from 'p-retry';
import NodeCache from 'node-cache';

// Types for OpenAI AI Visibility Testing
export interface AIVisibilityTest {
  keyword: string;
  domain: string;
  companyName: string;
  location?: string;
}

export interface AIVisibilityResult {
  keyword: string;
  mentioned: boolean;
  score: number; // 0-20 points based on mention quality and position
  position?: number; // 1-10+ if mentioned in recommendations
  context: string; // How it was mentioned
  recommendations: string[]; // All recommendations ChatGPT made
  followUpResponse?: string; // Response to follow-up question
  brandRecognition: boolean; // Does ChatGPT know the brand exists
}

export interface CompetitorAIAnalysis {
  domain: string;
  targetKeywords: string[];
  results: AIVisibilityResult[];
  overallScore: number;
  brandRecognitionScore: number;
  recommendationScore: number;
  insights: string[];
}

// Cache instance with 24 hour TTL for AI responses (they're relatively stable)
const cache = new NodeCache({ stdTTL: 86400 });

// Rate limiter: 3 requests per minute for ChatGPT API (conservative)
const limit = pLimit(1);
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 20000; // 20 seconds between requests

class OpenAIAPIClient {
  private client: OpenAI;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }

    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  /**
   * Test AI visibility for a single keyword
   */
  async testKeywordVisibility(test: AIVisibilityTest): Promise<AIVisibilityResult> {
    const cacheKey = `ai_visibility_${test.keyword}_${test.domain}_${test.location || 'global'}`;
    
    // Check cache first
    const cached = cache.get<AIVisibilityResult>(cacheKey);
    if (cached) {
      console.log(`OpenAI cache hit: ${cacheKey}`);
      return cached;
    }

    return limit(async () => {
      // Ensure minimum interval between requests
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }

      lastRequestTime = Date.now();

      return pRetry(async () => {
        // Step 1: Primary query
        const primaryQuery = this.buildPrimaryQuery(test);
        const primaryResponse = await this.callChatGPT(primaryQuery);
        
        // Step 2: Brand recognition test
        const brandQuery = `What do you know about ${test.companyName}? Please provide any information you have about this company.`;
        const brandResponse = await this.callChatGPT(brandQuery);
        
        // Step 3: Follow-up if not mentioned
        let followUpResponse = '';
        const mentioned = this.checkIfMentioned(primaryResponse, test.domain, test.companyName);
        
        if (!mentioned) {
          const topRecommendations = this.extractRecommendations(primaryResponse).slice(0, 3);
          if (topRecommendations.length > 0) {
            const followUpQuery = `Why did you recommend ${topRecommendations.join(', ')} but not mention ${test.companyName} (${test.domain})?`;
            followUpResponse = await this.callChatGPT(followUpQuery);
          }
        }

        const result = this.analyzeResponses(test, primaryResponse, brandResponse, followUpResponse);
        
        // Cache the result
        cache.set(cacheKey, result);
        
        return result;
      }, {
        retries: 2,
        minTimeout: 5000,
        maxTimeout: 15000,
        onFailedAttempt: (error) => {
          console.log(`OpenAI API attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        }
      });
    });
  }

  /**
   * Test AI visibility for multiple keywords
   */
  async testMultipleKeywords(tests: AIVisibilityTest[]): Promise<CompetitorAIAnalysis> {
    const results: AIVisibilityResult[] = [];
    
    // Process tests one by one due to rate limiting
    for (const test of tests) {
      try {
        const result = await this.testKeywordVisibility(test);
        results.push(result);
        
        // Add extra delay between keyword tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to test keyword ${test.keyword}:`, error);
        // Add a failed result to maintain data structure
        results.push({
          keyword: test.keyword,
          mentioned: false,
          score: 0,
          context: 'Test failed due to API error',
          recommendations: [],
          brandRecognition: false
        });
      }
    }

    return this.calculateOverallAnalysis(tests[0].domain, tests.map(t => t.keyword), results);
  }

  /**
   * Build the primary query for keyword testing
   */
  private buildPrimaryQuery(test: AIVisibilityTest): string {
    const location = test.location || '';
    const locationSuffix = location ? ` in ${location}` : '';
    
    // Vary the query format to get natural responses
    const queryFormats = [
      `What are the best ${test.keyword} companies${locationSuffix}?`,
      `Can you recommend some top ${test.keyword} services${locationSuffix}?`,
      `I'm looking for reliable ${test.keyword} providers${locationSuffix}. What do you suggest?`,
      `Who are the leading ${test.keyword} experts${locationSuffix}?`
    ];
    
    const randomIndex = Math.floor(Math.random() * queryFormats.length);
    return queryFormats[randomIndex];
  }

  /**
   * Call ChatGPT API with consistent settings
   */
  private async callChatGPT(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7, // Slight variation for natural responses
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from ChatGPT');
    }

    return content;
  }

  /**
   * Check if domain or company is mentioned in response
   */
  private checkIfMentioned(response: string, domain: string, companyName: string): boolean {
    const lowerResponse = response.toLowerCase();
    const lowerDomain = domain.toLowerCase();
    const lowerCompany = companyName.toLowerCase();
    
    // Remove common suffixes for better matching
    const domainWithoutSuffix = lowerDomain.replace(/\.(com|org|net|co\.uk|au|ca)$/, '');
    const companyWords = lowerCompany.split(/\s+/).filter(word => word.length > 2);
    
    // Check for domain mentions
    if (lowerResponse.includes(lowerDomain) || lowerResponse.includes(domainWithoutSuffix)) {
      return true;
    }
    
    // Check for company name mentions (must match significant words)
    if (companyWords.length > 0) {
      const mentionedWords = companyWords.filter(word => lowerResponse.includes(word));
      return mentionedWords.length >= Math.min(2, companyWords.length);
    }
    
    return false;
  }

  /**
   * Extract recommendations from ChatGPT response
   */
  private extractRecommendations(response: string): string[] {
    const recommendations: string[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for numbered lists, bullet points, or clear recommendations
      const patterns = [
        /^\d+\.\s*(.+)$/,           // 1. Company Name
        /^-\s*(.+)$/,              // - Company Name
        /^\*\s*(.+)$/,             // * Company Name
        /^•\s*(.+)$/,              // • Company Name
      ];
      
      for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          // Extract company name (remove extra description)
          const recommendation = match[1].split(/[:\-\(]/)[0].trim();
          if (recommendation.length > 2 && recommendation.length < 100) {
            recommendations.push(recommendation);
          }
        }
      }
    }
    
    // Also look for companies mentioned in sentences
    const sentences = response.split(/[.!?]/);
    for (const sentence of sentences) {
      // Look for patterns like "I recommend X" or "Consider Y"
      const mentionPatterns = [
        /(?:recommend|suggest|consider|try)\s+([A-Z][A-Za-z\s&]+?)(?:\s|,|\.)/g,
        /([A-Z][A-Za-z\s&]+?)\s+(?:is|are)\s+(?:excellent|great|top|leading)/g
      ];
      
      for (const pattern of mentionPatterns) {
        let match;
        while ((match = pattern.exec(sentence)) !== null) {
          const company = match[1].trim();
          if (company.length > 2 && company.length < 50 && !recommendations.includes(company)) {
            recommendations.push(company);
          }
        }
      }
    }
    
    return recommendations.slice(0, 10); // Limit to top 10
  }

  /**
   * Analyze all responses and calculate scores
   */
  private analyzeResponses(
    test: AIVisibilityTest,
    primaryResponse: string,
    brandResponse: string,
    followUpResponse: string
  ): AIVisibilityResult {
    const mentioned = this.checkIfMentioned(primaryResponse, test.domain, test.companyName);
    const recommendations = this.extractRecommendations(primaryResponse);
    
    // Brand recognition check
    const brandRecognition = brandResponse.length > 50 && 
      !brandResponse.toLowerCase().includes("i don't have") &&
      !brandResponse.toLowerCase().includes("i'm not familiar") &&
      !brandResponse.toLowerCase().includes("no information");
    
    // Calculate score based on mention quality and position
    let score = 0;
    let position: number | undefined;
    let context = '';
    
    if (mentioned) {
      // Find position in recommendations
      const lowerDomain = test.domain.toLowerCase();
      const lowerCompany = test.companyName.toLowerCase();
      
      for (let i = 0; i < recommendations.length; i++) {
        const rec = recommendations[i].toLowerCase();
        if (rec.includes(lowerDomain) || rec.includes(lowerCompany) || 
            lowerCompany.split(' ').some(word => word.length > 2 && rec.includes(word))) {
          position = i + 1;
          break;
        }
      }
      
      // Scoring based on position and mention quality
      if (position && position <= 5) {
        score = 20; // Top 5 mention
        context = `Mentioned in top ${position} recommendations`;
      } else if (position && position <= 10) {
        score = 15; // Top 10 mention
        context = `Mentioned in top 10 recommendations (position ${position})`;
      } else {
        score = 10; // Mentioned but not in clear recommendations
        context = 'Mentioned in response but not in clear recommendations';
      }
    } else if (followUpResponse && this.checkIfMentioned(followUpResponse, test.domain, test.companyName)) {
      score = 10; // Mentioned only after follow-up
      context = 'Mentioned only after follow-up questioning';
    } else if (brandRecognition) {
      score = 5; // Knows the brand but didn't recommend
      context = 'Brand recognized but not recommended for this query';
    } else {
      score = 0; // Not mentioned at all
      context = 'Not mentioned or recognized';
    }
    
    return {
      keyword: test.keyword,
      mentioned,
      score,
      position,
      context,
      recommendations,
      followUpResponse,
      brandRecognition
    };
  }

  /**
   * Calculate overall analysis from multiple keyword tests
   */
  private calculateOverallAnalysis(
    domain: string,
    keywords: string[],
    results: AIVisibilityResult[]
  ): CompetitorAIAnalysis {
    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    const maxScore = results.length * 20; // 20 points per keyword
    const overallScore = maxScore > 0 ? (totalScore / maxScore) * 10 : 0; // Convert to 1-10 scale
    
    const brandRecognitionCount = results.filter(r => r.brandRecognition).length;
    const brandRecognitionScore = results.length > 0 ? (brandRecognitionCount / results.length) * 10 : 0;
    
    const mentionedCount = results.filter(r => r.mentioned).length;
    const recommendationScore = results.length > 0 ? (mentionedCount / results.length) * 10 : 0;
    
    // Generate insights
    const insights: string[] = [];
    
    if (overallScore >= 8) {
      insights.push('Excellent AI visibility - consistently recommended across queries');
    } else if (overallScore >= 6) {
      insights.push('Good AI visibility with room for improvement');
    } else if (overallScore >= 4) {
      insights.push('Moderate AI visibility - some recognition but inconsistent recommendations');
    } else {
      insights.push('Poor AI visibility - rarely mentioned or recommended');
    }
    
    if (brandRecognitionScore < 5) {
      insights.push('Low brand recognition - AI assistants may not be familiar with your company');
    }
    
    const topKeywords = results.filter(r => r.score >= 15).map(r => r.keyword);
    if (topKeywords.length > 0) {
      insights.push(`Strong performance for: ${topKeywords.join(', ')}`);
    }
    
    const weakKeywords = results.filter(r => r.score <= 5).map(r => r.keyword);
    if (weakKeywords.length > 0) {
      insights.push(`Improvement needed for: ${weakKeywords.join(', ')}`);
    }
    
    return {
      domain,
      targetKeywords: keywords,
      results,
      overallScore: Math.round(overallScore * 10) / 10,
      brandRecognitionScore: Math.round(brandRecognitionScore * 10) / 10,
      recommendationScore: Math.round(recommendationScore * 10) / 10,
      insights
    };
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return {
      cacheHits: cache.keys().length,
      lastRequestTime: new Date(lastRequestTime).toISOString(),
      rateLimitInterval: MIN_REQUEST_INTERVAL
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
export const openaiClient = new OpenAIAPIClient();

// Export the class for testing
export { OpenAIAPIClient }; 