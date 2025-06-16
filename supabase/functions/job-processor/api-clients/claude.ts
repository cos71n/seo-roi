export class ClaudeClient {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateCommentary(prompt: any) {
    try {
      const systemPrompt = `You are an SEO expert providing personalized analysis for a business's SEO campaign performance. 
      Be professional, actionable, and specific. Avoid generic advice. 
      Focus on their specific industry, investment level, and competitive landscape.`;

      const userPrompt = this.formatPrompt(prompt);

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content[0].text;

      // Parse the structured response
      return this.parseCommentary(content);
    } catch (error) {
      console.error('Claude API error:', error);
      // Return fallback commentary
      return this.getFallbackCommentary(prompt);
    }
  }

  private formatPrompt(data: any) {
    return `
Analyze this SEO campaign performance data and provide structured commentary:

Company: ${data.context.company}
Domain: ${data.context.domain}
Industry: ${data.context.industry}
Monthly Investment: $${data.context.monthlySpend}
Campaign Duration: ${data.context.investmentDuration} months
Target Keywords: ${data.context.targetKeywords.join(', ')}

Overall Score: ${data.scores.overall.score}/10

Individual Scores:
- Authority Links: ${data.scores.authorityLinks.score}/10
- Authority Domains: ${data.scores.authorityDomains.score}/10  
- Traffic Growth: ${data.scores.trafficGrowth.score}/10
- Ranking Improvements: ${data.scores.rankings.score}/10
- AI Visibility: ${data.scores.aiVisibility.score}/10

Current Metrics:
- Backlinks: ${data.metrics.currentBacklinks}
- Referring Domains: ${data.metrics.currentDomains}
- Traffic Growth: ${data.metrics.trafficGrowth}%
- Ranking Improvements: ${data.metrics.rankingImprovements}

Top Competitors:
${data.competitors.map((c: any) => `- ${c.domain}: ${c.authorityDomains} domains, ${c.trafficGrowth}% growth`).join('\n')}

Content Gaps Identified:
${data.contentGaps.map((g: any) => `- ${g.theme}: ${g.potentialTraffic} potential traffic`).join('\n')}

Please provide:
1. Executive Summary (2-3 sentences)
2. Score Interpretation (what the overall score means for their business)
3. Key Wins (3-4 specific achievements)
4. Improvement Areas (3-4 specific areas needing attention)
5. Competitor Analysis (insights about their competitive position)
6. Recommendations (5 specific, actionable recommendations)
7. Next Steps (3 immediate actions they should take)

Format each section clearly with headers.`;
  }

  private parseCommentary(content: string) {
    // Simple parsing - in production this would be more robust
    const sections: any = {
      summary: '',
      scoreAnalysis: '',
      wins: [],
      improvements: [],
      competitorAnalysis: '',
      recommendations: [],
      nextSteps: []
    };

    // Parse each section from the response
    const summaryMatch = content.match(/Executive Summary[:\s]+(.*?)(?=Score Interpretation|$)/s);
    if (summaryMatch) sections.summary = summaryMatch[1].trim();

    const scoreMatch = content.match(/Score Interpretation[:\s]+(.*?)(?=Key Wins|$)/s);
    if (scoreMatch) sections.scoreAnalysis = scoreMatch[1].trim();

    const winsMatch = content.match(/Key Wins[:\s]+(.*?)(?=Improvement Areas|$)/s);
    if (winsMatch) {
      sections.wins = winsMatch[1].split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map(line => line.replace(/^[-\d.]\s*/, '').trim());
    }

    const improvementsMatch = content.match(/Improvement Areas[:\s]+(.*?)(?=Competitor Analysis|$)/s);
    if (improvementsMatch) {
      sections.improvements = improvementsMatch[1].split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map(line => line.replace(/^[-\d.]\s*/, '').trim());
    }

    const competitorMatch = content.match(/Competitor Analysis[:\s]+(.*?)(?=Recommendations|$)/s);
    if (competitorMatch) sections.competitorAnalysis = competitorMatch[1].trim();

    const recommendationsMatch = content.match(/Recommendations[:\s]+(.*?)(?=Next Steps|$)/s);
    if (recommendationsMatch) {
      sections.recommendations = recommendationsMatch[1].split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map(line => line.replace(/^[-\d.]\s*/, '').trim());
    }

    const nextStepsMatch = content.match(/Next Steps[:\s]+(.*?)$/s);
    if (nextStepsMatch) {
      sections.nextSteps = nextStepsMatch[1].split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map(line => line.replace(/^[-\d.]\s*/, '').trim());
    }

    return sections;
  }

  private getFallbackCommentary(data: any) {
    const score = data.scores.overall.score;
    const industry = data.context.industry || 'your industry';
    
    return {
      summary: `Your SEO campaign has achieved a score of ${score}/10, indicating ${
        score >= 8 ? 'excellent' : score >= 6 ? 'good' : score >= 4 ? 'moderate' : 'improvement-needed'
      } performance relative to your investment level and competitive landscape.`,
      
      scoreAnalysis: `A score of ${score}/10 in ${industry} suggests that your SEO investment is ${
        score >= 7 ? 'generating positive returns' : 'underperforming relative to expectations'
      }. This assessment considers your monthly spend, campaign duration, and competitor performance.`,
      
      wins: [
        'Consistent link building efforts showing positive momentum',
        'Domain authority growing steadily month-over-month',
        'Keyword rankings improving for target terms'
      ],
      
      improvements: [
        'Authority domain gap compared to top competitors',
        'Content gaps in high-value topic areas',
        'AI visibility needs enhancement for brand recognition'
      ],
      
      competitorAnalysis: 'Your competitors are investing heavily in content and link building. The data shows opportunities to close the gap through targeted campaigns.',
      
      recommendations: [
        'Focus on acquiring links from high-authority domains in your industry',
        'Develop content addressing identified topic gaps',
        'Implement structured data to improve AI visibility',
        'Accelerate link building velocity to match competitor growth',
        'Optimize existing content for featured snippets'
      ],
      
      nextSteps: [
        'Schedule a link building audit to identify quick wins',
        'Create content calendar targeting gap topics',
        'Review and optimize technical SEO elements'
      ]
    };
  }
} 