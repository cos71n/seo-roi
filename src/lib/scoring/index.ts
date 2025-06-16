import {
  AuthorityLinksData,
  AuthorityDomainsData,
  TrafficGrowthData,
  RankingImprovementsData,
  AIVisibilityData,
  ContentGapData,
  OverallScoreData,
  ScoringWeights,
  ScoreResult,
  ValidationResult,
  RedFlag,
  ScoringConfig
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

// Scoring configuration
const config: ScoringConfig = {
  minMonthlySpend: 1000,
  minInvestmentMonths: 6,
  linksPerThousand: 1.5,
  authorityLinkCriteria: {
    minDR: 20,
    minMonthlyTraffic: 1000,
    targetGeos: ['AU', 'US', 'UK', 'EU', 'NZ', 'CA']
  }
};

// Scoring weights according to requirements
const SCORING_WEIGHTS: ScoringWeights = {
  authorityLinks: 0.35,
  authorityDomains: 0.20,
  trafficGrowth: 0.20,
  rankingImprovements: 0.15,
  aiVisibility: 0.10
};

/**
 * Validates input data before scoring
 */
export function validateScoreInputs(data: {
  monthlySpend: number;
  investmentMonths: number;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.monthlySpend || !data.investmentMonths) {
    errors.push('Missing required data for scoring');
  }

  if (data.monthlySpend < config.minMonthlySpend) {
    errors.push(`Minimum $${config.minMonthlySpend}/month required for analysis`);
  }

  if (data.investmentMonths < config.minInvestmentMonths) {
    errors.push(`Minimum ${config.minInvestmentMonths} months investment required for analysis`);
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Main scoring function that calculates the overall SEO ROI score
 */
export function calculateOverallScore(
  authorityLinksData: AuthorityLinksData,
  authorityDomainsData: AuthorityDomainsData,
  trafficGrowthData: TrafficGrowthData,
  rankingImprovementsData: RankingImprovementsData,
  aiVisibilityData: AIVisibilityData,
  contentGapData?: ContentGapData
): OverallScoreData {
  // Validate inputs
  const validation = validateScoreInputs({
    monthlySpend: authorityLinksData.monthlySpend,
    investmentMonths: authorityLinksData.investmentMonths
  });

  if (!validation.isValid) {
    throw new Error(validation.errors?.join('; '));
  }

  // Calculate individual scores
  const authorityLinks = calculateAuthorityLinksScore(authorityLinksData);
  const authorityDomains = calculateAuthorityDomainsScore(authorityDomainsData);
  const trafficGrowth = calculateTrafficGrowthScore(trafficGrowthData);
  const rankingImprovements = calculateRankingImprovementsScore(rankingImprovementsData);
  const aiVisibility = calculateAIVisibilityScore(aiVisibilityData);

  // Collect all red flags
  const allRedFlags: RedFlag[] = [];
  if (authorityLinks.redFlags) allRedFlags.push(...authorityLinks.redFlags);
  if (authorityDomains.redFlags) allRedFlags.push(...authorityDomains.redFlags);
  if (trafficGrowth.redFlags) allRedFlags.push(...trafficGrowth.redFlags);
  if (rankingImprovements.redFlags) allRedFlags.push(...rankingImprovements.redFlags);
  if (aiVisibility.redFlags) allRedFlags.push(...aiVisibility.redFlags);

  // Add content gap red flags if data provided
  if (contentGapData) {
    const contentGapRedFlags = detectContentGapRedFlags(contentGapData);
    allRedFlags.push(...contentGapRedFlags);
  }

  // Add ROI red flags
  const roiRedFlags = detectROIRedFlags(
    authorityLinksData.monthlySpend,
    authorityLinksData.investmentMonths,
    {
      authorityLinks: authorityLinks.normalizedScore,
      authorityDomains: authorityDomains.normalizedScore,
      trafficGrowth: trafficGrowth.normalizedScore,
      rankingImprovements: rankingImprovements.normalizedScore,
      aiVisibility: aiVisibility.normalizedScore
    }
  );
  allRedFlags.push(...roiRedFlags);

  // Calculate weighted overall score (0-100)
  const weightedScore = 
    authorityLinks.score * SCORING_WEIGHTS.authorityLinks +
    authorityDomains.score * SCORING_WEIGHTS.authorityDomains +
    trafficGrowth.score * SCORING_WEIGHTS.trafficGrowth +
    rankingImprovements.score * SCORING_WEIGHTS.rankingImprovements +
    aiVisibility.score * SCORING_WEIGHTS.aiVisibility;

  // Normalize to 1-10 scale
  const normalizedScore = normalizeOverallScore(weightedScore);

  // Determine performance level based on detailed specs
  const performanceLevel = getPerformanceLevel(weightedScore);

  // Determine confidence level
  const confidence = getConfidenceLevel(authorityLinksData.investmentMonths);

  // Generate overall recommendations
  const recommendations = generateOverallRecommendations({
    authorityLinks,
    authorityDomains,
    trafficGrowth,
    rankingImprovements,
    aiVisibility,
    weightedScore,
    normalizedScore,
    performanceLevel,
    redFlags: allRedFlags
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
    recommendations,
    redFlags: allRedFlags,
    confidence
  };
}

function detectContentGapRedFlags(data: ContentGapData): RedFlag[] {
  const redFlags: RedFlag[] = [];
  
  // Red Flag 1: Competitors dominating multiple themes client ignores
  const missedThemes = data.competitorTrafficByTheme.filter(theme => {
    const clientThemeTraffic = data.clientTraffic[theme.name] || 0;
    const avgCompetitorTraffic = theme.competitorAverage;
    
    // Client gets <10% of competitor average traffic for this theme
    return clientThemeTraffic < (avgCompetitorTraffic * 0.1) && avgCompetitorTraffic > 1000;
  });
  
  if (missedThemes.length >= 3) {
    const totalMissedTraffic = missedThemes.reduce((sum, theme) => sum + theme.competitorAverage, 0);
    
    redFlags.push({
      type: 'MULTIPLE_CONTENT_GAPS',
      severity: 'CRITICAL',
      message: `Missing content for ${missedThemes.length} major traffic themes. Competitors are capturing ${totalMissedTraffic.toLocaleString()} monthly visits from themes you're not targeting.`,
      missedRevenue: calculateMissedRevenue(totalMissedTraffic),
      scorePenalty: -2
    });
  }
  
  // Red Flag 2: No commercial intent traffic
  const commercialThemes = data.competitorTrafficByTheme.filter(theme => 
    theme.intent === 'commercial' || theme.intent === 'transactional'
  );
  
  const clientCommercialTraffic = commercialThemes.reduce((sum, theme) => {
    return sum + (data.clientTraffic[theme.name] || 0);
  }, 0);
  
  if (clientCommercialTraffic < 500 && commercialThemes.length > 0) {
    redFlags.push({
      type: 'NO_COMMERCIAL_TRAFFIC',
      severity: 'HIGH',
      message: 'Minimal traffic from commercial/transactional keywords. SEO strategy not focused on revenue-generating terms.',
      scorePenalty: -1.5
    });
  }
  
  return redFlags;
}

function detectROIRedFlags(
  monthlySpend: number,
  investmentMonths: number,
  scores: Record<string, number>
): RedFlag[] {
  const redFlags: RedFlag[] = [];
  const totalInvestment = monthlySpend * investmentMonths;
  const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;
  
  // Red Flag 1: High spend, poor results
  if (monthlySpend >= 5000 && overallScore < 4) {
    redFlags.push({
      type: 'HIGH_SPEND_POOR_RESULTS',
      severity: 'CRITICAL',
      message: `Investing $${monthlySpend.toLocaleString()}/month ($${totalInvestment.toLocaleString()} total) but achieving poor results across all metrics. This suggests fundamental strategy or execution issues.`,
      scorePenalty: -2
    });
  }
  
  // Red Flag 2: Long investment, minimal results
  if (investmentMonths >= 18 && overallScore < 5) {
    redFlags.push({
      type: 'LONG_TERM_UNDERPERFORMANCE',
      severity: 'CRITICAL',
      message: `After ${investmentMonths} months of SEO investment, overall performance remains below average. Immediate strategic review required.`,
      scorePenalty: -2
    });
  }
  
  return redFlags;
}

function calculateMissedRevenue(missedTraffic: number): number {
  // Assuming 2% conversion rate and $200 average order value
  const conversionRate = 0.02;
  const averageOrderValue = 200;
  return Math.round(missedTraffic * conversionRate * averageOrderValue);
}

function normalizeOverallScore(rawScore: number): number {
  // Convert 0-100 to 1-10 scale
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

function getPerformanceLevel(score: number): OverallScoreData['performanceLevel'] {
  // Based on percentage of expected results
  if (score >= 80) return 'Excellent'; // 80%+ of expected results
  if (score >= 60) return 'Good'; // 60-79% of expected results
  if (score >= 40) return 'Average'; // 40-59% of expected results
  if (score >= 20) return 'Poor'; // 20-39% of expected results
  return 'Very Poor'; // <20% of expected results
}

function getConfidenceLevel(investmentMonths: number): 'High' | 'Medium' | 'Low' {
  if (investmentMonths >= 8) return 'High';
  if (investmentMonths >= 6) return 'Medium';
  return 'Low';
}

function generateOverallRecommendations(data: {
  authorityLinks: ScoreResult;
  authorityDomains: ScoreResult;
  trafficGrowth: ScoreResult;
  rankingImprovements: ScoreResult;
  aiVisibility: ScoreResult;
  weightedScore: number;
  normalizedScore: number;
  performanceLevel: string;
  redFlags: RedFlag[];
}): string[] {
  const recommendations: string[] = [];

  // Critical red flag handling
  const criticalFlags = data.redFlags.filter(flag => flag.severity === 'CRITICAL');
  if (criticalFlags.length > 0) {
    recommendations.push('🚨 CRITICAL: Multiple serious issues detected requiring immediate attention.');
    recommendations.push('Priority: Schedule strategic review with SEO provider within 7 days.');
  }

  // Overall performance message
  if (data.performanceLevel === 'Excellent') {
    recommendations.push('Outstanding SEO performance - your investment is delivering exceptional ROI.');
    recommendations.push('Continue current strategies while exploring advanced optimization opportunities.');
  } else if (data.performanceLevel === 'Good') {
    recommendations.push('Good SEO performance with solid ROI - strategic improvements can drive further growth.');
    recommendations.push('Focus on lowest-scoring areas for maximum impact.');
  } else if (data.performanceLevel === 'Average') {
    recommendations.push('Average SEO performance - significant optimization opportunities available.');
    recommendations.push('Review strategy focusing on competitive gaps and content opportunities.');
  } else if (data.performanceLevel === 'Poor') {
    recommendations.push('SEO performance is underdelivering - comprehensive strategy review needed.');
    recommendations.push('Consider audit of current tactics and potential provider evaluation.');
  } else {
    recommendations.push('Critical underperformance detected - immediate action required.');
    recommendations.push('Evaluate continuing with current SEO approach vs alternative strategies.');
  }

  // Identify weakest areas
  const scoreComponents = [
    { name: 'Authority Links', score: data.authorityLinks.normalizedScore },
    { name: 'Authority Domains', score: data.authorityDomains.normalizedScore },
    { name: 'Traffic Growth', score: data.trafficGrowth.normalizedScore },
    { name: 'Ranking Improvements', score: data.rankingImprovements.normalizedScore },
    { name: 'AI Visibility', score: data.aiVisibility.normalizedScore }
  ].sort((a, b) => a.score - b.score);

  // Specific recommendations for lowest scoring areas
  const lowestScoring = scoreComponents[0];
  const secondLowest = scoreComponents[1];

  if (lowestScoring.score < 5) {
    recommendations.push(`Immediate focus needed: ${lowestScoring.name} (${lowestScoring.score}/10)`);
  }
  
  if (secondLowest.score < 5) {
    recommendations.push(`Secondary priority: ${secondLowest.name} (${secondLowest.score}/10)`);
  }

  // ROI-specific recommendations
  if (data.weightedScore < 40 && data.redFlags.some(f => f.type === 'HIGH_SPEND_POOR_RESULTS')) {
    recommendations.push('ROI Alert: Current spend level not justified by results.');
    recommendations.push('Consider: Reduce spend while addressing fundamental issues or change providers.');
  }

  // Quick wins
  if (data.aiVisibility.normalizedScore < 5 && data.trafficGrowth.normalizedScore >= 6) {
    recommendations.push('Quick Win: Optimize existing content for AI visibility to capture future traffic.');
  }

  if (data.rankingImprovements.normalizedScore >= 6 && data.trafficGrowth.normalizedScore < 6) {
    recommendations.push('Quick Win: Improve meta descriptions and titles to boost CTR from existing rankings.');
  }

  return recommendations;
}

/**
 * Generate red flag commentary for reports
 */
export function generateRedFlagCommentary(redFlags: RedFlag[], clientData: {
  monthlySpend: number;
  investmentMonths: number;
  companyName: string;
}): string {
  const criticalFlags = redFlags.filter(flag => flag.severity === 'CRITICAL');
  const highFlags = redFlags.filter(flag => flag.severity === 'HIGH');
  
  if (criticalFlags.length > 0) {
    return `🚨 CRITICAL ISSUES DETECTED: ${clientData.companyName}'s SEO investment shows serious red flags that require immediate attention. ${criticalFlags.map(flag => flag.message).join(' ')} These issues suggest fundamental problems with your current SEO strategy or execution that are preventing you from achieving expected returns on your $${clientData.monthlySpend.toLocaleString()}/month investment.`;
  }
  
  if (highFlags.length > 0) {
    return `⚠️ SIGNIFICANT CONCERNS: Your SEO performance analysis reveals important issues that are limiting your ROI. ${highFlags.map(flag => flag.message).join(' ')} Addressing these concerns should be a priority to improve your return on the $${(clientData.monthlySpend * clientData.investmentMonths).toLocaleString()} invested over ${clientData.investmentMonths} months.`;
  }
  
  if (redFlags.length > 0) {
    return `📊 OPTIMIZATION OPPORTUNITIES: While your SEO campaign shows progress, we've identified several areas for improvement. ${redFlags.map(flag => flag.message).join(' ')} Addressing these items will help maximize your SEO investment returns.`;
  }
  
  return '';
} 