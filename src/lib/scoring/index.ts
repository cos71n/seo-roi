import {
  AuthorityLinksData,
  AuthorityDomainsData,
  TrafficGrowthData,
  RankingImprovementsData,
  AIVisibilityData,
  OverallScoreData,
  ScoringWeights,
  ScoreResult
} from './types';

import { calculateAuthorityLinksScore } from './authority-links';
import { calculateAuthorityDomainsScore } from './authority-domains';
import { calculateTrafficGrowthScore } from './traffic-growth';
import { calculateRankingImprovementsScore } from './ranking-improvements';
import { calculateAIVisibilityScore } from './ai-visibility';

// Export all types and individual scoring functions
export * from './types';
export { calculateAuthorityLinksScore } from './authority-links';
export { calculateAuthorityDomainsScore } from './authority-domains';
export { calculateTrafficGrowthScore } from './traffic-growth';
export { calculateRankingImprovementsScore } from './ranking-improvements';
export { calculateAIVisibilityScore } from './ai-visibility';

// Scoring weights according to requirements
const SCORING_WEIGHTS: ScoringWeights = {
  authorityLinks: 0.35,
  authorityDomains: 0.20,
  trafficGrowth: 0.20,
  rankingImprovements: 0.15,
  aiVisibility: 0.10
};

/**
 * Main scoring function that calculates the overall SEO ROI score
 * by combining all five scoring algorithms with their respective weights
 */
export function calculateOverallScore(
  authorityLinksData: AuthorityLinksData,
  authorityDomainsData: AuthorityDomainsData,
  trafficGrowthData: TrafficGrowthData,
  rankingImprovementsData: RankingImprovementsData,
  aiVisibilityData: AIVisibilityData
): OverallScoreData {
  // Calculate individual scores
  const authorityLinks = calculateAuthorityLinksScore(authorityLinksData);
  const authorityDomains = calculateAuthorityDomainsScore(authorityDomainsData);
  const trafficGrowth = calculateTrafficGrowthScore(trafficGrowthData);
  const rankingImprovements = calculateRankingImprovementsScore(rankingImprovementsData);
  const aiVisibility = calculateAIVisibilityScore(aiVisibilityData);

  // Calculate weighted overall score (0-100)
  const weightedScore = 
    authorityLinks.score * SCORING_WEIGHTS.authorityLinks +
    authorityDomains.score * SCORING_WEIGHTS.authorityDomains +
    trafficGrowth.score * SCORING_WEIGHTS.trafficGrowth +
    rankingImprovements.score * SCORING_WEIGHTS.rankingImprovements +
    aiVisibility.score * SCORING_WEIGHTS.aiVisibility;

  // Normalize to 1-10 scale
  const normalizedScore = normalizeOverallScore(weightedScore);

  // Determine performance level
  const performanceLevel = getPerformanceLevel(normalizedScore);

  // Generate overall recommendations
  const recommendations = generateOverallRecommendations({
    authorityLinks,
    authorityDomains,
    trafficGrowth,
    rankingImprovements,
    aiVisibility,
    weightedScore,
    normalizedScore
  });

  return {
    authorityLinks,
    authorityDomains,
    trafficGrowth,
    rankingImprovements,
    aiVisibility,
    weightedScore,
    normalizedScore,
    performanceLevel,
    recommendations
  };
}

/**
 * Calculate score with missing data handling
 * Provides partial scoring when some metrics are unavailable
 */
export function calculatePartialScore(
  data: {
    authorityLinks?: AuthorityLinksData;
    authorityDomains?: AuthorityDomainsData;
    trafficGrowth?: TrafficGrowthData;
    rankingImprovements?: RankingImprovementsData;
    aiVisibility?: AIVisibilityData;
  }
): {
  score: number;
  normalizedScore: number;
  availableMetrics: string[];
  missingMetrics: string[];
  confidence: number;
} {
  const availableMetrics: string[] = [];
  const missingMetrics: string[] = [];
  let totalWeight = 0;
  let weightedScore = 0;

  // Check each metric and calculate partial scores
  if (data.authorityLinks) {
    const score = calculateAuthorityLinksScore(data.authorityLinks);
    weightedScore += score.score * SCORING_WEIGHTS.authorityLinks;
    totalWeight += SCORING_WEIGHTS.authorityLinks;
    availableMetrics.push('Authority Links');
  } else {
    missingMetrics.push('Authority Links');
  }

  if (data.authorityDomains) {
    const score = calculateAuthorityDomainsScore(data.authorityDomains);
    weightedScore += score.score * SCORING_WEIGHTS.authorityDomains;
    totalWeight += SCORING_WEIGHTS.authorityDomains;
    availableMetrics.push('Authority Domains');
  } else {
    missingMetrics.push('Authority Domains');
  }

  if (data.trafficGrowth) {
    const score = calculateTrafficGrowthScore(data.trafficGrowth);
    weightedScore += score.score * SCORING_WEIGHTS.trafficGrowth;
    totalWeight += SCORING_WEIGHTS.trafficGrowth;
    availableMetrics.push('Traffic Growth');
  } else {
    missingMetrics.push('Traffic Growth');
  }

  if (data.rankingImprovements) {
    const score = calculateRankingImprovementsScore(data.rankingImprovements);
    weightedScore += score.score * SCORING_WEIGHTS.rankingImprovements;
    totalWeight += SCORING_WEIGHTS.rankingImprovements;
    availableMetrics.push('Ranking Improvements');
  } else {
    missingMetrics.push('Ranking Improvements');
  }

  if (data.aiVisibility) {
    const score = calculateAIVisibilityScore(data.aiVisibility);
    weightedScore += score.score * SCORING_WEIGHTS.aiVisibility;
    totalWeight += SCORING_WEIGHTS.aiVisibility;
    availableMetrics.push('AI Visibility');
  } else {
    missingMetrics.push('AI Visibility');
  }

  // Normalize score based on available weight
  const normalizedPartialScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
  const normalizedScore = normalizeOverallScore(normalizedPartialScore);

  // Calculate confidence based on available data
  const confidence = totalWeight * 100;

  return {
    score: normalizedPartialScore,
    normalizedScore,
    availableMetrics,
    missingMetrics,
    confidence
  };
}

function normalizeOverallScore(rawScore: number): number {
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

function getPerformanceLevel(normalizedScore: number): OverallScoreData['performanceLevel'] {
  if (normalizedScore >= 8) return 'Excellent';
  if (normalizedScore >= 6) return 'Good';
  if (normalizedScore >= 4) return 'Average';
  if (normalizedScore >= 2) return 'Below Average';
  return 'Poor';
}

function generateOverallRecommendations(scores: {
  authorityLinks: ScoreResult;
  authorityDomains: ScoreResult;
  trafficGrowth: ScoreResult;
  rankingImprovements: ScoreResult;
  aiVisibility: ScoreResult;
  weightedScore: number;
  normalizedScore: number;
}): string[] {
  const recommendations: string[] = [];

  // Overall performance message
  if (scores.normalizedScore >= 8) {
    recommendations.push('Outstanding SEO performance - your investment is delivering exceptional ROI');
    recommendations.push('Continue current strategies while exploring advanced optimization opportunities');
  } else if (scores.normalizedScore >= 6) {
    recommendations.push('Good SEO performance with solid ROI - room for strategic improvements');
    recommendations.push('Focus on lowest-scoring areas for maximum impact on overall performance');
  } else if (scores.normalizedScore >= 4) {
    recommendations.push('Average SEO performance - significant optimization opportunities available');
    recommendations.push('Prioritize improvements in bottom two scoring categories');
  } else {
    recommendations.push('SEO performance is underdelivering - immediate strategic review recommended');
    recommendations.push('Consider comprehensive audit and potential provider evaluation');
  }

  // Identify weakest areas
  const scoreComponents = [
    { name: 'Authority Links', score: scores.authorityLinks.normalizedScore, weight: SCORING_WEIGHTS.authorityLinks },
    { name: 'Authority Domains', score: scores.authorityDomains.normalizedScore, weight: SCORING_WEIGHTS.authorityDomains },
    { name: 'Traffic Growth', score: scores.trafficGrowth.normalizedScore, weight: SCORING_WEIGHTS.trafficGrowth },
    { name: 'Ranking Improvements', score: scores.rankingImprovements.normalizedScore, weight: SCORING_WEIGHTS.rankingImprovements },
    { name: 'AI Visibility', score: scores.aiVisibility.normalizedScore, weight: SCORING_WEIGHTS.aiVisibility }
  ].sort((a, b) => a.score - b.score);

  // Recommendations for lowest scoring areas
  const lowestScoring = scoreComponents[0];
  const secondLowest = scoreComponents[1];

  recommendations.push(`Priority 1: Improve ${lowestScoring.name} (currently scoring ${lowestScoring.score}/10)`);
  recommendations.push(`Priority 2: Enhance ${secondLowest.name} (currently scoring ${secondLowest.score}/10)`);

  // Calculate potential score improvement
  const potentialImprovement = calculatePotentialImprovement(scoreComponents);
  if (potentialImprovement > 2) {
    recommendations.push(`Potential: Addressing weak areas could improve overall score by ${potentialImprovement} points`);
  }

  // ROI-specific recommendations
  if (scores.weightedScore < 50) {
    recommendations.push('ROI Alert: Current performance suggests SEO spend may not be optimized');
    recommendations.push('Action: Request detailed performance audit from your SEO provider');
  }

  // Quick wins based on specific scores
  if (scores.aiVisibility.normalizedScore < 5 && scores.trafficGrowth.normalizedScore >= 6) {
    recommendations.push('Quick Win: Optimize for AI visibility to capture emerging search traffic');
  }

  if (scores.rankingImprovements.normalizedScore < 5 && scores.authorityLinks.normalizedScore >= 6) {
    recommendations.push('Quick Win: Leverage strong link profile to boost keyword rankings');
  }

  return recommendations;
}

function calculatePotentialImprovement(scoreComponents: Array<{name: string; score: number; weight: number}>): number {
  // Calculate potential if bottom 2 components improved to average
  const averageScore = scoreComponents.reduce((sum, comp) => sum + comp.score, 0) / scoreComponents.length;
  
  let potentialWeightedImprovement = 0;
  for (let i = 0; i < Math.min(2, scoreComponents.length); i++) {
    if (scoreComponents[i].score < averageScore) {
      const improvement = (averageScore - scoreComponents[i].score) * scoreComponents[i].weight;
      potentialWeightedImprovement += improvement;
    }
  }

  return Math.round(potentialWeightedImprovement);
} 