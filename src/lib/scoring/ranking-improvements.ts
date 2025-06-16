import { RankingImprovementsData, ScoreResult } from './types';

/**
 * Ranking Improvements Scoring Algorithm (15% weight)
 * 
 * Evaluates keyword ranking performance based on:
 * - Distribution of keywords in top positions (3, 10, 20)
 * - Average position changes over time
 * - New keywords entering rankings
 * - Competitive comparison for shared keywords
 */
export function calculateRankingImprovementsScore(
  data: RankingImprovementsData
): ScoreResult {
  const insights: string[] = [];
  const details: Record<string, any> = {};

  // Calculate position distribution score (0-35 points)
  const positionScore = calculatePositionDistributionScore(data, insights, details);

  // Calculate improvement velocity score (0-25 points)
  const velocityScore = calculateImprovementVelocityScore(data, insights, details);

  // Calculate new rankings score (0-20 points)
  const newRankingsScore = calculateNewRankingsScore(data, insights, details);

  // Calculate competitive performance score (0-20 points)
  const competitiveScore = calculateCompetitiveRankingsScore(data, insights, details);

  // Total raw score (0-100)
  const rawScore = positionScore + velocityScore + newRankingsScore + competitiveScore;

  // Normalize to 1-10 scale
  const normalizedScore = normalizeScore(rawScore);

  // Add overall insights
  generateRankingInsights(rawScore, data, insights);

  return {
    score: rawScore,
    normalizedScore,
    details: {
      ...details,
      positionScore,
      velocityScore,
      newRankingsScore,
      competitiveScore,
      rankingDistribution: {
        top3: data.keywordsInTop3,
        top10: data.keywordsInTop10,
        top20: data.keywordsInTop20,
        total: data.totalKeywords,
        percentages: {
          top3: (data.keywordsInTop3 / data.totalKeywords) * 100,
          top10: (data.keywordsInTop10 / data.totalKeywords) * 100,
          top20: (data.keywordsInTop20 / data.totalKeywords) * 100
        }
      }
    },
    insights
  };
}

function calculatePositionDistributionScore(
  data: RankingImprovementsData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // Top 3 positions - up to 15 points
  const top3Percentage = (data.keywordsInTop3 / data.totalKeywords) * 100;
  if (top3Percentage >= 20) {
    score += 15;
    insights.push(`Excellent top 3 rankings: ${top3Percentage.toFixed(1)}% of keywords`);
  } else if (top3Percentage >= 15) {
    score += 12;
    insights.push(`Strong top 3 presence: ${top3Percentage.toFixed(1)}% of keywords`);
  } else if (top3Percentage >= 10) {
    score += 9;
    insights.push(`Good top 3 rankings but room for improvement`);
  } else if (top3Percentage >= 5) {
    score += 6;
    insights.push(`Limited top 3 rankings - focus on high-intent keywords`);
  } else {
    score += 3;
    insights.push(`Very few top 3 rankings - competitive content needed`);
  }

  // Top 10 positions - up to 10 points
  const top10Percentage = (data.keywordsInTop10 / data.totalKeywords) * 100;
  if (top10Percentage >= 40) {
    score += 10;
    insights.push(`${top10Percentage.toFixed(1)}% of keywords in top 10 - strong visibility`);
  } else if (top10Percentage >= 30) {
    score += 8;
  } else if (top10Percentage >= 20) {
    score += 6;
  } else if (top10Percentage >= 10) {
    score += 4;
    insights.push(`Only ${top10Percentage.toFixed(1)}% in top 10 - significant optimization needed`);
  } else {
    score += 2;
  }

  // Top 20 positions - up to 10 points
  const top20Percentage = (data.keywordsInTop20 / data.totalKeywords) * 100;
  if (top20Percentage >= 60) {
    score += 10;
  } else if (top20Percentage >= 45) {
    score += 8;
  } else if (top20Percentage >= 30) {
    score += 6;
  } else if (top20Percentage >= 20) {
    score += 4;
  } else {
    score += 2;
    insights.push(`Low overall visibility - comprehensive SEO overhaul recommended`);
  }

  details.positionMetrics = {
    top3Percentage,
    top10Percentage,
    top20Percentage,
    visibilityScore: (top3Percentage * 3 + top10Percentage * 2 + top20Percentage) / 6
  };

  return score;
}

function calculateImprovementVelocityScore(
  data: RankingImprovementsData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // Average position improvement - up to 25 points
  const avgImprovement = data.averagePositionChange;
  
  if (avgImprovement >= 10) {
    score = 25;
    insights.push(`Outstanding ranking improvements: ${avgImprovement.toFixed(1)} positions average gain`);
  } else if (avgImprovement >= 5) {
    score = 20;
    insights.push(`Excellent ranking momentum: ${avgImprovement.toFixed(1)} positions average gain`);
  } else if (avgImprovement >= 3) {
    score = 15;
    insights.push(`Good ranking improvements: ${avgImprovement.toFixed(1)} positions average gain`);
  } else if (avgImprovement >= 1) {
    score = 10;
    insights.push(`Modest ranking gains: ${avgImprovement.toFixed(1)} positions average`);
  } else if (avgImprovement >= 0) {
    score = 5;
    insights.push(`Rankings stable but not improving significantly`);
  } else {
    score = 0;
    insights.push(`WARNING: Rankings declining by ${Math.abs(avgImprovement).toFixed(1)} positions average`);
  }

  // Calculate improvement rate
  const improvementRate = data.totalKeywords > 0 ? 
    ((data.keywordsInTop10 - (data.keywordsInTop10 - avgImprovement * data.totalKeywords / 50)) / data.totalKeywords) * 100 : 0;

  details.velocityMetrics = {
    averageImprovement: avgImprovement,
    improvementRate,
    projectedTop10In3Months: Math.round(data.keywordsInTop10 + (avgImprovement * data.totalKeywords / 20))
  };

  return score;
}

function calculateNewRankingsScore(
  data: RankingImprovementsData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // New keywords entering rankings - up to 20 points
  const newKeywordPercentage = (data.newRankingKeywords / data.totalKeywords) * 100;
  
  if (newKeywordPercentage >= 20) {
    score = 20;
    insights.push(`Excellent expansion: ${data.newRankingKeywords} new keywords ranking`);
  } else if (newKeywordPercentage >= 15) {
    score = 16;
    insights.push(`Strong keyword expansion: ${data.newRankingKeywords} new rankings`);
  } else if (newKeywordPercentage >= 10) {
    score = 12;
    insights.push(`Good new keyword acquisition: ${data.newRankingKeywords} new rankings`);
  } else if (newKeywordPercentage >= 5) {
    score = 8;
    insights.push(`Moderate expansion - target more long-tail opportunities`);
  } else {
    score = 4;
    insights.push(`Limited new rankings - content gap analysis recommended`);
  }

  // Calculate expansion opportunity
  const expansionPotential = Math.max(0, data.totalKeywords * 0.15 - data.newRankingKeywords);
  
  details.expansionMetrics = {
    newKeywords: data.newRankingKeywords,
    newKeywordPercentage,
    expansionPotential: Math.round(expansionPotential),
    growthRate: newKeywordPercentage / 6 // Monthly rate assuming 6-month period
  };

  return score;
}

function calculateCompetitiveRankingsScore(
  data: RankingImprovementsData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  const { betterRankings, worseRankings, totalSharedKeywords } = data.competitorComparison;
  
  // Win rate against competitors - up to 20 points
  if (totalSharedKeywords > 0) {
    const winRate = (betterRankings / totalSharedKeywords) * 100;
    
    if (winRate >= 60) {
      score = 20;
      insights.push(`Dominating competitors: winning ${winRate.toFixed(0)}% of shared keywords`);
    } else if (winRate >= 50) {
      score = 16;
      insights.push(`Competitive advantage: winning ${winRate.toFixed(0)}% of shared keywords`);
    } else if (winRate >= 40) {
      score = 12;
      insights.push(`Competitive parity: winning ${winRate.toFixed(0)}% of shared keywords`);
    } else if (winRate >= 30) {
      score = 8;
      insights.push(`Behind competitors: winning only ${winRate.toFixed(0)}% of shared keywords`);
    } else {
      score = 4;
      insights.push(`Significantly trailing competitors in rankings`);
    }

    // Identify improvement opportunities
    const competitorGap = worseRankings - betterRankings;
    if (competitorGap > 10) {
      insights.push(`Opportunity: ${competitorGap} keywords where competitors outrank you`);
    }

    details.competitiveMetrics = {
      winRate,
      betterRankings,
      worseRankings,
      totalSharedKeywords,
      competitiveGap: competitorGap,
      improvementPotential: worseRankings
    };
  } else {
    score = 10; // Neutral score if no shared keywords
    insights.push('Limited keyword overlap with competitors - unique strategy detected');
    details.competitiveMetrics = {
      winRate: 0,
      totalSharedKeywords: 0,
      note: 'No direct competition on tracked keywords'
    };
  }

  return score;
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

function generateRankingInsights(
  score: number,
  data: RankingImprovementsData,
  insights: string[]
): void {
  // Overall ranking performance assessment
  if (score >= 80) {
    insights.push('EXCELLENT: Ranking performance is exceptional');
    insights.push('Strategy: Maintain momentum while targeting featured snippets');
  } else if (score >= 60) {
    insights.push('GOOD: Rankings improving steadily with strong potential');
    insights.push('Focus: Convert page 2 rankings to page 1 positions');
  } else if (score >= 40) {
    insights.push('AVERAGE: Ranking performance needs acceleration');
    insights.push('Priority: On-page optimization and content enhancement');
  } else if (score >= 20) {
    insights.push('BELOW AVERAGE: Significant ranking challenges detected');
    insights.push('Action: Technical SEO audit and content strategy review');
  } else {
    insights.push('POOR: Critical ranking performance issues');
    insights.push('Urgent: Complete SEO strategy overhaul required');
  }

  // Calculate potential traffic impact
  const potentialTop10Keywords = Math.round(data.totalKeywords * 0.4); // Target 40% in top 10
  const currentTop10Gap = potentialTop10Keywords - data.keywordsInTop10;
  
  if (currentTop10Gap > 0) {
    insights.push(`Traffic opportunity: Move ${currentTop10Gap} more keywords into top 10`);
    
    // Estimate traffic increase (assuming 5x traffic for top 10 vs 11-20)
    const estimatedTrafficIncrease = currentTop10Gap * 5;
    insights.push(`Potential impact: ${estimatedTrafficIncrease}% traffic increase achievable`);
  }

  // Specific tactical recommendations
  if (data.keywordsInTop3 < data.totalKeywords * 0.15) {
    insights.push('Tactic: Focus on snippet optimization for position 4-10 keywords');
  }
  
  if (data.newRankingKeywords < data.totalKeywords * 0.10) {
    insights.push('Tactic: Expand content to target related long-tail keywords');
  }
} 