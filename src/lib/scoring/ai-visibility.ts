import { AIVisibilityData, ScoreResult } from './types';

/**
 * AI Visibility Scoring Algorithm (10% weight)
 * 
 * Evaluates brand visibility in AI responses based on:
 * - Frequency of brand mentions in AI responses
 * - Positive sentiment and recommendations
 * - Comparison to competitor mentions
 * - Industry-specific context and relevance
 */
export function calculateAIVisibilityScore(
  data: AIVisibilityData
): ScoreResult {
  const insights: string[] = [];
  const details: Record<string, any> = {};

  // Calculate mention frequency score (0-30 points)
  const mentionScore = calculateMentionFrequencyScore(data, insights, details);

  // Calculate sentiment and recommendation score (0-30 points)
  const sentimentScore = calculateSentimentScore(data, insights, details);

  // Calculate competitive visibility score (0-25 points)
  const competitiveScore = calculateCompetitiveVisibilityScore(data, insights, details);

  // Calculate industry relevance score (0-15 points)
  const relevanceScore = calculateIndustryRelevanceScore(data, insights, details);

  // Total raw score (0-100)
  const rawScore = mentionScore + sentimentScore + competitiveScore + relevanceScore;

  // Normalize to 1-10 scale
  const normalizedScore = normalizeScore(rawScore);

  // Add overall insights
  generateAIVisibilityInsights(rawScore, data, insights);

  return {
    score: rawScore,
    normalizedScore,
    details: {
      ...details,
      mentionScore,
      sentimentScore,
      competitiveScore,
      relevanceScore,
      aiMetrics: {
        mentionRate: (data.brandMentions / data.totalQueriesTested) * 100,
        positiveSentiment: data.positiveSentiment,
        recommendationRate: data.recommendationRate,
        queriesTested: data.totalQueriesTested
      }
    },
    insights
  };
}

function calculateMentionFrequencyScore(
  data: AIVisibilityData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  const mentionRate = (data.brandMentions / data.totalQueriesTested) * 100;

  // Brand mention frequency - up to 30 points
  if (mentionRate >= 40) {
    score = 30;
    insights.push(`Excellent AI visibility: mentioned in ${mentionRate.toFixed(0)}% of queries`);
  } else if (mentionRate >= 30) {
    score = 25;
    insights.push(`Strong AI presence: mentioned in ${mentionRate.toFixed(0)}% of queries`);
  } else if (mentionRate >= 20) {
    score = 20;
    insights.push(`Good AI visibility: mentioned in ${mentionRate.toFixed(0)}% of queries`);
  } else if (mentionRate >= 10) {
    score = 15;
    insights.push(`Moderate AI presence: ${mentionRate.toFixed(0)}% mention rate`);
  } else if (mentionRate >= 5) {
    score = 10;
    insights.push(`Limited AI visibility: only ${mentionRate.toFixed(0)}% mention rate`);
  } else if (mentionRate > 0) {
    score = 5;
    insights.push(`Very low AI visibility: ${mentionRate.toFixed(1)}% mention rate`);
  } else {
    score = 0;
    insights.push('No AI visibility detected - brand not mentioned in any queries');
  }

  details.mentionMetrics = {
    mentionRate,
    totalMentions: data.brandMentions,
    mentionGap: Math.max(0, Math.round(data.totalQueriesTested * 0.3 - data.brandMentions))
  };

  return score;
}

function calculateSentimentScore(
  data: AIVisibilityData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // Positive sentiment score - up to 15 points
  if (data.positiveSentiment >= 90) {
    score += 15;
    insights.push(`Outstanding reputation: ${data.positiveSentiment}% positive sentiment`);
  } else if (data.positiveSentiment >= 80) {
    score += 12;
    insights.push(`Strong positive sentiment: ${data.positiveSentiment}%`);
  } else if (data.positiveSentiment >= 70) {
    score += 9;
    insights.push(`Good sentiment score: ${data.positiveSentiment}% positive`);
  } else if (data.positiveSentiment >= 60) {
    score += 6;
    insights.push(`Mixed sentiment: ${data.positiveSentiment}% positive`);
  } else {
    score += 3;
    insights.push(`Low positive sentiment: ${data.positiveSentiment}% - reputation management needed`);
  }

  // Recommendation rate - up to 15 points
  if (data.recommendationRate >= 50) {
    score += 15;
    insights.push(`Frequently recommended: ${data.recommendationRate}% recommendation rate`);
  } else if (data.recommendationRate >= 35) {
    score += 12;
    insights.push(`Often recommended: ${data.recommendationRate}% recommendation rate`);
  } else if (data.recommendationRate >= 20) {
    score += 9;
    insights.push(`Sometimes recommended: ${data.recommendationRate}% rate`);
  } else if (data.recommendationRate >= 10) {
    score += 6;
    insights.push(`Occasionally recommended: ${data.recommendationRate}% rate`);
  } else {
    score += 3;
    insights.push(`Rarely recommended: ${data.recommendationRate}% - authority building needed`);
  }

  details.sentimentMetrics = {
    positiveSentiment: data.positiveSentiment,
    recommendationRate: data.recommendationRate,
    reputationScore: (data.positiveSentiment + data.recommendationRate) / 2
  };

  return score;
}

function calculateCompetitiveVisibilityScore(
  data: AIVisibilityData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // Get top competitor mentions
  const competitorMentions = Array.from(data.competitorMentions.entries())
    .sort((a, b) => b[1] - a[1]);
  
  const topCompetitor = competitorMentions[0];
  const averageCompetitorMentions = competitorMentions.length > 0
    ? competitorMentions.reduce((sum, [_, mentions]) => sum + mentions, 0) / competitorMentions.length
    : 0;

  // Compare to average competitor mentions - up to 25 points
  if (data.brandMentions > averageCompetitorMentions * 1.5) {
    score = 25;
    insights.push('Leading AI visibility among competitors');
  } else if (data.brandMentions >= averageCompetitorMentions) {
    score = 20;
    insights.push('Competitive AI visibility with market leaders');
  } else if (data.brandMentions >= averageCompetitorMentions * 0.75) {
    score = 15;
    insights.push('Close to competitor AI visibility levels');
  } else if (data.brandMentions >= averageCompetitorMentions * 0.5) {
    score = 10;
    insights.push('Behind competitors in AI visibility');
  } else {
    score = 5;
    insights.push('Significantly trailing competitors in AI presence');
  }

  // Identify specific competitive gaps
  if (topCompetitor && topCompetitor[1] > data.brandMentions) {
    insights.push(`${topCompetitor[0]} mentioned ${topCompetitor[1] - data.brandMentions} times more`);
  }

  details.competitiveMetrics = {
    brandMentions: data.brandMentions,
    averageCompetitorMentions,
    topCompetitor: topCompetitor ? { name: topCompetitor[0], mentions: topCompetitor[1] } : null,
    competitivePosition: competitorMentions.findIndex(([name]) => name === 'YourBrand') + 1 || competitorMentions.length + 1,
    totalCompetitors: competitorMentions.length
  };

  return score;
}

function calculateIndustryRelevanceScore(
  data: AIVisibilityData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // Industry context relevance - up to 15 points
  const industryKeywords = extractIndustryKeywords(data.industryContext);
  const relevanceIndicators = [
    'leader', 'expert', 'trusted', 'recommended', 'top-rated', 
    'best', 'preferred', 'specialist', 'authority', 'go-to'
  ];

  const relevanceCount = relevanceIndicators.filter(indicator => 
    data.industryContext.toLowerCase().includes(indicator)
  ).length;

  if (relevanceCount >= 5) {
    score = 15;
    insights.push('Recognized as industry authority in AI responses');
  } else if (relevanceCount >= 3) {
    score = 12;
    insights.push('Strong industry positioning in AI context');
  } else if (relevanceCount >= 2) {
    score = 9;
    insights.push('Moderate industry recognition in AI');
  } else if (relevanceCount >= 1) {
    score = 6;
    insights.push('Some industry relevance in AI responses');
  } else {
    score = 3;
    insights.push('Limited industry-specific recognition in AI');
  }

  details.relevanceMetrics = {
    industryKeywords: industryKeywords.length,
    relevanceIndicators: relevanceCount,
    industryContext: data.industryContext.substring(0, 100) + '...'
  };

  return score;
}

function extractIndustryKeywords(context: string): string[] {
  // Extract industry-specific keywords from context
  const words = context.toLowerCase().split(/\s+/);
  const industryTerms = [
    'service', 'solution', 'provider', 'company', 'firm',
    'agency', 'consultant', 'specialist', 'expert', 'professional'
  ];
  
  return words.filter(word => industryTerms.some(term => word.includes(term)));
}

function normalizeScore(rawScore: number): number {
  // Convert 0-100 to 1-10 scale with proper distribution
  if (rawScore >= 90) return 10;
  if (rawScore >= 80) return 9;
  if (rawScore >= 70) return 8;
  if (rawScore >= 60) return 7;
  if (rawScore >= 50) return 6;
  if (rawScore >= 40) return 5;
  if (rawScore >= 30) return 4;
  if (rawScore >= 20) return 3;
  if (rawScore >= 10) return 2;
  return 1;
}

function generateAIVisibilityInsights(
  score: number,
  data: AIVisibilityData,
  insights: string[]
): void {
  // Overall AI visibility assessment
  if (score >= 80) {
    insights.push('EXCELLENT: Strong AI visibility and brand authority');
    insights.push('Strategy: Maintain thought leadership and content quality');
  } else if (score >= 60) {
    insights.push('GOOD: Growing AI presence with positive recognition');
    insights.push('Focus: Increase content depth and E-E-A-T signals');
  } else if (score >= 40) {
    insights.push('AVERAGE: Some AI visibility but improvement needed');
    insights.push('Priority: Build authoritative content and earn quality mentions');
  } else if (score >= 20) {
    insights.push('BELOW AVERAGE: Limited AI visibility impacting discoverability');
    insights.push('Action: Create comprehensive, cited content on core topics');
  } else {
    insights.push('POOR: Minimal to no AI visibility');
    insights.push('Urgent: Establish topical authority through expert content');
  }

  // Calculate missed opportunity
  const potentialMentions = Math.round(data.totalQueriesTested * 0.3);
  const mentionGap = potentialMentions - data.brandMentions;
  
  if (mentionGap > 0) {
    const potentialTrafficIncrease = mentionGap * 50; // Estimate 50 visits per AI mention
    insights.push(`Opportunity: ${mentionGap} additional AI mentions could drive ${potentialTrafficIncrease} monthly visits`);
  }

  // AI optimization recommendations
  if (data.brandMentions < data.totalQueriesTested * 0.2) {
    insights.push('Tactic: Create definitive guides and FAQ content');
    insights.push('Tactic: Earn mentions from authoritative industry sources');
  }

  if (data.recommendationRate < 30) {
    insights.push('Tactic: Showcase expertise through case studies and data');
    insights.push('Tactic: Build stronger review and testimonial presence');
  }
} 