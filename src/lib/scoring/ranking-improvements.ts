import { RankingImprovementsData, RankingChange, ScoreResult, RedFlag } from './types';

/**
 * Ranking Improvements Scoring Algorithm (15% weight)
 * Based on position value weighting with exponential decay
 */
export function calculateRankingImprovementsScore(data: RankingImprovementsData): ScoreResult {
  const insights: string[] = [];
  const details: Record<string, any> = {};
  const redFlags: RedFlag[] = [];

  // Calculate total value and possible value
  let totalValue = 0;
  let totalPossibleValue = 0;
  let top3Count = 0;
  let top10Count = 0;
  let top20Count = 0;
  let newRankings = 0;
  
  data.rankingChanges.forEach(change => {
    const oldValue = change.oldPosition > 100 ? 0 : getPositionValue(change.oldPosition);
    const newValue = change.newPosition > 100 ? 0 : getPositionValue(change.newPosition);
    const improvement = newValue - oldValue;
    
    totalValue += improvement;
    totalPossibleValue += (10 - oldValue); // Maximum possible improvement
    
    // Count current positions
    if (change.newPosition <= 3) top3Count++;
    if (change.newPosition <= 10) top10Count++;
    if (change.newPosition <= 20) top20Count++;
    
    // Count new rankings (was >100, now <=100)
    if (change.oldPosition > 100 && change.newPosition <= 100) {
      newRankings++;
    }
  });
  
  // Calculate improvement percentage
  const improvementPercentage = totalPossibleValue > 0 
    ? (totalValue / totalPossibleValue) * 100 
    : data.rankingChanges.length === 0 ? 0 : 50; // No improvement possible = neutral
  
  // Convert to 1-10 scale
  let normalizedScore = Math.max(1, Math.min(10, improvementPercentage / 10));
  
  // Detect red flags
  const rankingRedFlags = detectRankingRedFlags(data, top3Count, top10Count);
  redFlags.push(...rankingRedFlags);
  
  // Apply red flag penalties
  const totalPenalty = redFlags.reduce((sum, flag) => sum + flag.scorePenalty, 0);
  const adjustedScore = Math.max(1, normalizedScore + totalPenalty);
  
  // Generate insights
  generateRankingInsights(
    data, 
    improvementPercentage, 
    totalValue, 
    totalPossibleValue,
    top3Count,
    top10Count,
    top20Count,
    newRankings,
    insights
  );
  
  // Add details
  details.totalKeywords = data.totalKeywords;
  details.improvementPercentage = improvementPercentage;
  details.totalValue = totalValue;
  details.totalPossibleValue = totalPossibleValue;
  details.averageImprovement = data.totalKeywords > 0 ? totalValue / data.totalKeywords : 0;
  details.positionDistribution = {
    top3: top3Count,
    top10: top10Count,
    top20: top20Count,
    percentages: {
      top3: data.totalKeywords > 0 ? (top3Count / data.totalKeywords) * 100 : 0,
      top10: data.totalKeywords > 0 ? (top10Count / data.totalKeywords) * 100 : 0,
      top20: data.totalKeywords > 0 ? (top20Count / data.totalKeywords) * 100 : 0
    }
  };
  details.newRankings = newRankings;
  
  // Analyze by intent if available
  const commercialKeywords = data.rankingChanges.filter(c => 
    c.intent === 'commercial' || c.intent === 'transactional'
  );
  if (commercialKeywords.length > 0) {
    details.commercialKeywordPerformance = {
      count: commercialKeywords.length,
      inTop10: commercialKeywords.filter(c => c.newPosition <= 10).length,
      avgPosition: commercialKeywords.reduce((sum, c) => sum + c.newPosition, 0) / commercialKeywords.length
    };
  }

  return {
    score: improvementPercentage,
    normalizedScore: adjustedScore,
    adjustedScore: adjustedScore !== normalizedScore ? adjustedScore : undefined,
    details,
    insights,
    redFlags: redFlags.length > 0 ? redFlags : undefined
  };
}

function getPositionValue(position: number): number {
  if (position <= 3) return 10;
  if (position <= 5) return 8;
  if (position <= 10) return 6;
  if (position <= 20) return 3;
  return 1;
}

function detectRankingRedFlags(
  data: RankingImprovementsData,
  top3Count: number,
  top10Count: number
): RedFlag[] {
  const redFlags: RedFlag[] = [];
  
  // Red Flag 1: Very few top rankings after significant investment
  const top10Percentage = data.totalKeywords > 0 ? (top10Count / data.totalKeywords) * 100 : 0;
  if (data.investmentMonths >= 12 && top10Percentage < 10) {
    redFlags.push({
      type: 'POOR_RANKING_PERFORMANCE',
      severity: 'CRITICAL',
      message: `Only ${top10Percentage.toFixed(0)}% of keywords ranking in top 10 after ${data.investmentMonths} months. This indicates fundamental SEO issues.`,
      scorePenalty: -2
    });
  }
  
  // Red Flag 2: No high-intent keyword rankings
  const commercialKeywords = data.rankingChanges.filter(c => 
    c.intent === 'commercial' || c.intent === 'transactional'
  );
  const commercialInTop10 = commercialKeywords.filter(c => c.newPosition <= 10).length;
  
  if (commercialKeywords.length > 0 && commercialInTop10 === 0 && data.investmentMonths >= 8) {
    redFlags.push({
      type: 'NO_COMMERCIAL_RANKINGS',
      severity: 'HIGH',
      message: 'No commercial/transactional keywords ranking in top 10. SEO not driving revenue-focused traffic.',
      scorePenalty: -1.5
    });
  }
  
  // Red Flag 3: Declining rankings
  let decliningKeywords = 0;
  data.rankingChanges.forEach(change => {
    if (change.oldPosition <= 20 && change.newPosition > change.oldPosition) {
      decliningKeywords++;
    }
  });
  
  const decliningPercentage = data.totalKeywords > 0 ? (decliningKeywords / data.totalKeywords) * 100 : 0;
  if (decliningPercentage > 30) {
    redFlags.push({
      type: 'WIDESPREAD_RANKING_DECLINES',
      severity: 'HIGH',
      message: `${decliningPercentage.toFixed(0)}% of keywords have declining rankings. Possible algorithm penalty or competitive losses.`,
      scorePenalty: -1.5
    });
  }
  
  return redFlags;
}

function generateRankingInsights(
  data: RankingImprovementsData,
  improvementPercentage: number,
  totalValue: number,
  totalPossibleValue: number,
  top3Count: number,
  top10Count: number,
  top20Count: number,
  newRankings: number,
  insights: string[]
): void {
  // Overall performance
  if (improvementPercentage >= 70) {
    insights.push(`Excellent ranking improvements: ${improvementPercentage.toFixed(0)}% of possible gains achieved.`);
  } else if (improvementPercentage >= 50) {
    insights.push(`Good ranking progress: ${improvementPercentage.toFixed(0)}% of potential improvements captured.`);
  } else if (improvementPercentage >= 30) {
    insights.push(`Moderate improvements: ${improvementPercentage.toFixed(0)}% of possible gains - room for growth.`);
  } else {
    insights.push(`Limited ranking improvements: Only ${improvementPercentage.toFixed(0)}% of potential achieved.`);
  }
  
  // Position distribution
  const top3Percentage = data.totalKeywords > 0 ? (top3Count / data.totalKeywords) * 100 : 0;
  const top10Percentage = data.totalKeywords > 0 ? (top10Count / data.totalKeywords) * 100 : 0;
  
  insights.push(`Current rankings: ${top3Percentage.toFixed(0)}% in top 3, ${top10Percentage.toFixed(0)}% in top 10.`);
  
  // Highlight strengths or weaknesses
  if (top3Percentage >= 20) {
    insights.push('Strong top 3 presence indicates good content relevance and authority.');
  } else if (top3Percentage < 5) {
    insights.push('Limited top 3 rankings - focus on improving best-performing pages.');
  }
  
  // New rankings
  if (newRankings > 0) {
    insights.push(`Expanded visibility: ${newRankings} keywords entered rankings from unranked.`);
  }
  
  // Commercial intent performance
  const commercialKeywords = data.rankingChanges.filter(c => 
    c.intent === 'commercial' || c.intent === 'transactional'
  );
  if (commercialKeywords.length > 0) {
    const commercialInTop10 = commercialKeywords.filter(c => c.newPosition <= 10).length;
    const commercialPercentage = (commercialInTop10 / commercialKeywords.length) * 100;
    
    if (commercialPercentage >= 50) {
      insights.push(`Good commercial performance: ${commercialPercentage.toFixed(0)}% of money keywords in top 10.`);
    } else {
      insights.push(`Commercial opportunity: Only ${commercialPercentage.toFixed(0)}% of money keywords in top 10.`);
    }
  }
  
  // Average movement
  let totalMovement = 0;
  let improvedCount = 0;
  data.rankingChanges.forEach(change => {
    const movement = change.oldPosition - change.newPosition;
    if (movement > 0) {
      totalMovement += movement;
      improvedCount++;
    }
  });
  
  if (improvedCount > 0) {
    const avgMovement = totalMovement / improvedCount;
    insights.push(`Average improvement: ${avgMovement.toFixed(1)} positions for keywords that improved.`);
  }
  
  // Recommendations
  if (top10Percentage < 20) {
    insights.push('Priority: On-page optimization for keywords ranking 11-20 to break into top 10.');
  }
  
  if (newRankings < data.totalKeywords * 0.1) {
    insights.push('Opportunity: Expand content to target more long-tail variations.');
  }
  
  // Calculate traffic potential
  const potentialTop10Keywords = Math.round(data.totalKeywords * 0.4) - top10Count;
  if (potentialTop10Keywords > 0) {
    insights.push(`Traffic opportunity: Moving ${potentialTop10Keywords} more keywords to top 10 could 5x their traffic.`);
  }
} 