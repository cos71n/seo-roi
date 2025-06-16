import Anthropic from '@anthropic-ai/sdk';
import pRetry from 'p-retry';
import NodeCache from 'node-cache';

// Types for Claude API
export interface CommentaryRequest {
  industry: string;
  domain: string;
  companyName: string;
  monthlySpend: number;
  investmentDuration: number;
  overallScore: number;
  linkScore: number;
  domainScore: number;
  trafficScore: number;
  rankingScore: number;
  aiVisibilityScore: number;
  authorityDomainGap: number;
  competitorData?: any;
  contentGaps?: any;
  aiVisibilityData?: any;
}

export interface CommentaryResponse {
  executiveSummary: string;
  linkBuildingAnalysis: string;
  authorityDomainGapAnalysis: string;
  aiVisibilityAssessment: string;
  contentStrategyReview: string;
  competitivePosition: string;
  roiAssessment: string;
  actionPlan: string;
}

// Cache instance with 2 hour TTL for commentary (less volatile than API data)
const cache = new NodeCache({ stdTTL: 7200 });

class ClaudeAPIClient {
  private client: Anthropic;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable.');
    }

    this.client = new Anthropic({
      apiKey: this.apiKey,
    });
  }

  /**
   * Generate comprehensive SEO analysis commentary
   */
  async generateCommentary(request: CommentaryRequest): Promise<CommentaryResponse> {
    const cacheKey = `commentary_${request.domain}_${request.overallScore}_${request.monthlySpend}`;
    
    // Check cache first
    const cached = cache.get<CommentaryResponse>(cacheKey);
    if (cached) {
      console.log(`Claude cache hit: ${cacheKey}`);
      return cached;
    }

    return pRetry(async () => {
      const prompt = this.buildAnalysisPrompt(request);
      
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.3, // Slightly creative but consistent
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }

      const commentary = this.parseCommentary(content.text);
      
      // Cache the result
      cache.set(cacheKey, commentary);
      
      return commentary;
    }, {
      retries: 3,
      minTimeout: 1000,
      maxTimeout: 5000,
      factor: 2,
      onFailedAttempt: (error) => {
        console.log(`Claude API attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
      }
    });
  }

  /**
   * Build the analysis prompt for Claude
   */
  private buildAnalysisPrompt(request: CommentaryRequest): string {
    const {
      industry,
      domain,
      companyName,
      monthlySpend,
      investmentDuration,
      overallScore,
      linkScore,
      domainScore,
      trafficScore,
      rankingScore,
      aiVisibilityScore,
      authorityDomainGap,
      competitorData,
      contentGaps,
      aiVisibilityData
    } = request;

    return `You are an expert SEO consultant analyzing the performance of a ${industry} business. Provide a comprehensive, actionable assessment in a professional yet accessible tone.

BUSINESS CONTEXT:
- Company: ${companyName}
- Domain: ${domain}
- Industry: ${industry}
- Monthly SEO Investment: $${monthlySpend.toLocaleString()}
- Investment Duration: ${investmentDuration} months

PERFORMANCE SCORES (1-10 scale):
- Overall Score: ${overallScore}/10
- Link Building Score: ${linkScore}/10
- Authority Domains Score: ${domainScore}/10
- Traffic Growth Score: ${trafficScore}/10
- Ranking Improvements Score: ${rankingScore}/10
- AI Visibility Score: ${aiVisibilityScore}/10

KEY METRICS:
- Authority Domain Gap: ${authorityDomainGap} domains behind competitors
${competitorData ? `- Competitor Analysis: ${JSON.stringify(competitorData).slice(0, 500)}...` : ''}
${contentGaps ? `- Content Gaps Identified: ${JSON.stringify(contentGaps).slice(0, 500)}...` : ''}
${aiVisibilityData ? `- AI Visibility Data: ${JSON.stringify(aiVisibilityData).slice(0, 500)}...` : ''}

Please provide analysis in exactly these 8 sections (use these exact headers):

## Executive Summary
Provide a 2-3 sentence overview of their current SEO performance and the primary opportunities.

## Link Building Analysis
Analyze their link building efforts based on the link score and authority domain gap. Reference specific metrics.

## Authority Domain Gap Analysis
Explain what the ${authorityDomainGap} domain gap means for their competitive position and business impact.

## AI Visibility Assessment
Analyze their AI visibility score and what it means for future-proofing their SEO strategy.

## Content Strategy Review
Based on identified content gaps, provide specific recommendations for content development.

## Competitive Position
Assess how they stack up against competitors and key positioning opportunities.

## ROI Assessment
Evaluate whether their $${monthlySpend.toLocaleString()}/month investment is delivering appropriate returns after ${investmentDuration} months.

## Action Plan
Provide 3-5 specific, prioritized recommendations with expected impact and timeframes.

Make the analysis specific to the ${industry} industry and reference their actual performance metrics. Avoid generic advice - use their data to provide actionable insights.`;
  }

  /**
   * Parse Claude's response into structured commentary
   */
  private parseCommentary(text: string): CommentaryResponse {
    const sections = [
      'Executive Summary',
      'Link Building Analysis',
      'Authority Domain Gap Analysis',
      'AI Visibility Assessment',
      'Content Strategy Review',
      'Competitive Position',
      'ROI Assessment',
      'Action Plan'
    ];

    const commentary: any = {};
    let currentSection = '';
    let currentContent = '';

    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check if this line is a section header
      const sectionMatch = sections.find(section => 
        trimmed.includes(section) && (trimmed.startsWith('#') || trimmed.startsWith('**'))
      );
      
      if (sectionMatch) {
        // Save previous section
        if (currentSection && currentContent.trim()) {
          const key = this.sectionToKey(currentSection);
          commentary[key] = currentContent.trim();
        }
        
        // Start new section
        currentSection = sectionMatch;
        currentContent = '';
      } else if (currentSection && trimmed) {
        // Add content to current section
        currentContent += line + '\n';
      }
    }
    
    // Save the last section
    if (currentSection && currentContent.trim()) {
      const key = this.sectionToKey(currentSection);
      commentary[key] = currentContent.trim();
    }

    // Ensure all required fields are present
    return {
      executiveSummary: commentary.executiveSummary || 'Analysis summary not available.',
      linkBuildingAnalysis: commentary.linkBuildingAnalysis || 'Link building analysis not available.',
      authorityDomainGapAnalysis: commentary.authorityDomainGapAnalysis || 'Authority domain gap analysis not available.',
      aiVisibilityAssessment: commentary.aiVisibilityAssessment || 'AI visibility assessment not available.',
      contentStrategyReview: commentary.contentStrategyReview || 'Content strategy review not available.',
      competitivePosition: commentary.competitivePosition || 'Competitive position analysis not available.',
      roiAssessment: commentary.roiAssessment || 'ROI assessment not available.',
      actionPlan: commentary.actionPlan || 'Action plan not available.'
    };
  }

  /**
   * Convert section names to camelCase keys
   */
  private sectionToKey(section: string): string {
    const keyMap: Record<string, string> = {
      'Executive Summary': 'executiveSummary',
      'Link Building Analysis': 'linkBuildingAnalysis',
      'Authority Domain Gap Analysis': 'authorityDomainGapAnalysis',
      'AI Visibility Assessment': 'aiVisibilityAssessment',
      'Content Strategy Review': 'contentStrategyReview',
      'Competitive Position': 'competitivePosition',
      'ROI Assessment': 'roiAssessment',
      'Action Plan': 'actionPlan'
    };
    
    return keyMap[section] || section.toLowerCase().replace(/\s+/g, '');
  }

  /**
   * Generate a shorter summary for email/preview use
   */
  async generateSummary(request: CommentaryRequest): Promise<string> {
    const cacheKey = `summary_${request.domain}_${request.overallScore}`;
    
    // Check cache first
    const cached = cache.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    return pRetry(async () => {
      const prompt = `Provide a brief 2-3 sentence summary of this SEO assessment for ${request.companyName} (${request.domain}):
      
Overall Score: ${request.overallScore}/10
Monthly Spend: $${request.monthlySpend.toLocaleString()}
Industry: ${request.industry}
Authority Domain Gap: ${request.authorityDomainGap}

Focus on the most important finding and one key recommendation. Keep it concise and actionable.`;

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }

      const summary = content.text.trim();
      cache.set(cacheKey, summary);
      
      return summary;
    }, {
      retries: 2,
      minTimeout: 1000,
      maxTimeout: 3000,
    });
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return {
      cacheHits: cache.keys().length,
      cacheSize: cache.keys().length
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
export const claudeClient = new ClaudeAPIClient();

// Export the class for testing
export { ClaudeAPIClient }; 