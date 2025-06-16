import { AIVisibilityData, AIKeywordResult, ScoreResult, RedFlag } from './types';

/**
 * AI Visibility Scoring Algorithm (10% weight)
 * Tests visibility for top 5 target keywords through AI assistants
 */
export function calculateAIVisibilityScore(data: AIVisibilityData): ScoreResult {
  const insights: string[] = [];
  const details: Record<string, any> = {};
  const redFlags: RedFlag[] = [];

  // Calculate total score based on keyword results
  let totalScore = 0;
  const maxScorePerKeyword = 20;
  const maxPossibleScore = data.keywordResults.length * maxScorePerKeyword;
  
  // Track performance metrics
  let mentionedCount = 0;
  let top5Count = 0;
  let top10Count = 0;
  let followUpCount = 0;
  let recognizedCount = 0;
  
  data.keywordResults.forEach(result => {
    let keywordScore = 0;
    
    if (result.mentioned && result.position && result.position <= 5) {
      keywordScore = 20; // Top 5 mention
      top5Count++;
      mentionedCount++;
    } else if (result.mentioned && result.position && result.position <= 10) {
      keywordScore = 15; // Top 10 mention
      top10Count++;
      mentionedCount++;
    } else if (result.followUpMentioned) {
      keywordScore = 10; // Mentioned after follow-up
      followUpCount++;
    } else if (result.brandRecognized) {
      keywordScore = 5; // Brand recognized but not recommended
      recognizedCount++;
    }
    // 0 points if not mentioned or recognized
    
    totalScore += keywordScore;
  });
  
  // Calculate percentage and normalize to 1-10 scale
  const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  let normalizedScore = Math.max(1, Math.min(10, percentage / 10));
  
  // Detect red flags
  const aiRedFlags = detectAIVisibilityRedFlags(data, percentage, mentionedCount);
  redFlags.push(...aiRedFlags);
  
  // Apply red flag penalties
  const totalPenalty = redFlags.reduce((sum, flag) => sum + flag.scorePenalty, 0);
  const adjustedScore = Math.max(1, normalizedScore + totalPenalty);
  
  // Generate insights
  generateAIInsights(
    data,
    percentage,
    mentionedCount,
    top5Count,
    top10Count,
    followUpCount,
    recognizedCount,
    insights
  );
  
  // Add details
  details.totalScore = totalScore;
  details.maxPossibleScore = maxPossibleScore;
  details.scorePercentage = percentage;
  details.keywordBreakdown = data.keywordResults.map(result => {
    let score = 0;
    let status = 'Not mentioned';
    
    if (result.mentioned && result.position && result.position <= 5) {
      score = 20;
      status = `Top ${result.position} mention`;
    } else if (result.mentioned && result.position && result.position <= 10) {
      score = 15;
      status = `Position ${result.position} mention`;
    } else if (result.followUpMentioned) {
      score = 10;
      status = 'Mentioned on follow-up';
    } else if (result.brandRecognized) {
      score = 5;
      status = 'Brand recognized only';
    }
    
    return {
      keyword: result.keyword,
      score,
      status,
      mentioned: result.mentioned,
      position: result.position
    };
  });
  
  details.performanceMetrics = {
    mentionedCount,
    top5Count,
    top10Count,
    followUpCount,
    recognizedCount,
    mentionRate: (mentionedCount / data.keywordResults.length) * 100,
    top5Rate: (top5Count / data.keywordResults.length) * 100
  };

  return {
    score: percentage,
    normalizedScore: adjustedScore,
    adjustedScore: adjustedScore !== normalizedScore ? adjustedScore : undefined,
    details,
    insights,
    redFlags: redFlags.length > 0 ? redFlags : undefined
  };
}

function detectAIVisibilityRedFlags(
  data: AIVisibilityData,
  percentage: number,
  mentionedCount: number
): RedFlag[] {
  const redFlags: RedFlag[] = [];
  
  // Red Flag: AI invisibility after investment
  if (data.investmentMonths >= 6 && percentage < 20) {
    redFlags.push({
      type: 'AI_INVISIBILITY',
      severity: 'MEDIUM',
      message: 'Not recognized by AI assistants for target keywords. Brand authority issues.',
      scorePenalty: -1
    });
  }
  
  // Red Flag: Zero mentions
  if (mentionedCount === 0 && data.investmentMonths >= 8) {
    redFlags.push({
      type: 'NO_AI_PRESENCE',
      severity: 'HIGH',
      message: 'Complete absence from AI recommendations despite SEO investment. Missing future traffic opportunities.',
      scorePenalty: -1.5
    });
  }
  
  return redFlags;
}

function generateAIInsights(
  data: AIVisibilityData,
  percentage: number,
  mentionedCount: number,
  top5Count: number,
  top10Count: number,
  followUpCount: number,
  recognizedCount: number,
  insights: string[]
): void {
  const totalKeywords = data.keywordResults.length;
  
  // Overall performance
  if (percentage >= 60) {
    insights.push(`Strong AI visibility: ${percentage.toFixed(0)}% score across ${totalKeywords} target keywords.`);
  } else if (percentage >= 40) {
    insights.push(`Moderate AI presence: ${percentage.toFixed(0)}% visibility score indicates room for improvement.`);
  } else if (percentage >= 20) {
    insights.push(`Limited AI visibility: ${percentage.toFixed(0)}% score suggests brand authority gaps.`);
  } else {
    insights.push(`Poor AI visibility: Only ${percentage.toFixed(0)}% score - missing AI-driven traffic.`);
  }
  
  // Mention breakdown
  if (mentionedCount > 0) {
    insights.push(`Direct mentions: ${mentionedCount} of ${totalKeywords} keywords (${((mentionedCount/totalKeywords)*100).toFixed(0)}%).`);
    
    if (top5Count > 0) {
      insights.push(`Premium placement: ${top5Count} keywords in top 5 positions.`);
    }
  } else {
    insights.push('No direct mentions in AI responses for any target keywords.');
  }
  
  // Follow-up performance
  if (followUpCount > 0) {
    insights.push(`Secondary visibility: ${followUpCount} keywords mentioned after follow-up questions.`);
  }
  
  // Brand recognition
  if (recognizedCount > 0 && mentionedCount === 0) {
    insights.push(`Brand awareness exists but not recommended - authority building needed.`);
  }
  
  // Competitive implications
  const mentionRate = (mentionedCount / totalKeywords) * 100;
  if (mentionRate < 20) {
    insights.push('Competitors likely dominating AI recommendations in your space.');
  } else if (mentionRate >= 60) {
    insights.push('Strong competitive advantage in AI-driven search results.');
  }
  
  // Recommendations
  if (percentage < 40) {
    insights.push('Priority: Create comprehensive, cited content on core service topics.');
    insights.push('Focus: Build E-E-A-T signals through case studies and expert content.');
  }
  
  if (top5Count === 0 && mentionedCount > 0) {
    insights.push('Opportunity: Improve content depth to achieve top 5 AI recommendations.');
  }
  
  // Future traffic impact
  if (mentionedCount < totalKeywords * 0.4) {
    const missedKeywords = Math.ceil(totalKeywords * 0.4 - mentionedCount);
    insights.push(`AI traffic opportunity: Getting ${missedKeywords} more keywords mentioned could drive significant future traffic.`);
  }
  
  // Strategic insights
  if (data.investmentMonths >= 12 && percentage < 30) {
    insights.push('Long-term risk: Low AI visibility will impact future organic traffic as AI adoption grows.');
  }
} 