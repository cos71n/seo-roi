import { AuthorityLinksData, ScoreResult } from './types';

/**
 * Authority Links Scoring Algorithm (35% weight)
 * 
 * Evaluates the quality and growth of backlinks based on:
 * - Total number of referring domains
 * - Distribution of high/medium/low authority links
 * - Monthly growth rate
 * - Comparison to competitors and industry benchmarks
 */
export function calculateAuthorityLinksScore(
  data: AuthorityLinksData
): ScoreResult {
  const insights: string[] = [];
  const details: Record<string, any> = {};

  // Handle edge case: no links at all
  if (data.totalLinks === 0) {
    insights.push('No backlinks detected - critical SEO foundation missing');
    insights.push('Immediate action required: Begin link building campaign');
    
    return {
      score: 0,
      normalizedScore: 1,
      details: {
        qualityScore: 0,
        growthScore: 0,
        competitiveScore: 0,
        breakdown: {
          highAuthorityPercentage: 0,
          mediumAuthorityPercentage: 0,
          lowAuthorityPercentage: 0,
        }
      },
      insights
    };
  }

  // Calculate quality score (0-40 points)
  const qualityScore = calculateQualityScore(data, insights, details);

  // Calculate growth score (0-30 points)
  const growthScore = calculateGrowthScore(data, insights, details);

  // Calculate competitive position score (0-30 points)
  const competitiveScore = calculateCompetitiveScore(data, insights, details);

  // Total raw score (0-100)
  const rawScore = qualityScore + growthScore + competitiveScore;

  // Normalize to 1-10 scale
  const normalizedScore = normalizeScore(rawScore);

  // Add overall insights
  generateOverallInsights(rawScore, data, insights);

  return {
    score: rawScore,
    normalizedScore,
    details: {
      ...details,
      qualityScore,
      growthScore,
      competitiveScore,
      breakdown: {
        highAuthorityPercentage: (data.highAuthorityLinks / data.totalLinks) * 100,
        mediumAuthorityPercentage: (data.mediumAuthorityLinks / data.totalLinks) * 100,
        lowAuthorityPercentage: (data.lowAuthorityLinks / data.totalLinks) * 100,
      }
    },
    insights
  };
}

function calculateQualityScore(
  data: AuthorityLinksData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // High authority links (DR 70+) - up to 20 points
  const highAuthorityRatio = data.highAuthorityLinks / data.totalLinks;
  if (highAuthorityRatio >= 0.15) {
    score += 20;
    insights.push('Excellent high-authority link profile (15%+ DR 70+ domains)');
  } else if (highAuthorityRatio >= 0.10) {
    score += 15;
    insights.push('Good high-authority link profile (10-15% DR 70+ domains)');
  } else if (highAuthorityRatio >= 0.05) {
    score += 10;
    insights.push('Average high-authority link profile (5-10% DR 70+ domains)');
  } else {
    score += 5;
    insights.push('Low percentage of high-authority links - significant room for improvement');
  }

  // Medium authority links (DR 40-69) - up to 10 points
  const mediumAuthorityRatio = data.mediumAuthorityLinks / data.totalLinks;
  if (mediumAuthorityRatio >= 0.30) {
    score += 10;
  } else if (mediumAuthorityRatio >= 0.20) {
    score += 7;
  } else {
    score += 3;
  }

  // Total link volume - up to 10 points
  if (data.totalLinks >= 1000) {
    score += 10;
    insights.push('Strong overall link volume (1000+ referring domains)');
  } else if (data.totalLinks >= 500) {
    score += 7;
    insights.push('Good link volume (500+ referring domains)');
  } else if (data.totalLinks >= 100) {
    score += 4;
    insights.push('Moderate link volume - continued link building needed');
  } else {
    score += 1;
    insights.push('Low link volume - aggressive link building strategy required');
  }

  details.qualityMetrics = {
    highAuthorityRatio,
    mediumAuthorityRatio,
    totalLinks: data.totalLinks
  };

  return score;
}

function calculateGrowthScore(
  data: AuthorityLinksData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;
  const monthlyGrowth = data.linkGrowthRate;

  // Monthly growth rate - up to 30 points
  if (monthlyGrowth >= 10) {
    score = 30;
    insights.push(`Exceptional link growth rate (${monthlyGrowth.toFixed(1)}% monthly)`);
  } else if (monthlyGrowth >= 5) {
    score = 25;
    insights.push(`Strong link growth rate (${monthlyGrowth.toFixed(1)}% monthly)`);
  } else if (monthlyGrowth >= 2) {
    score = 20;
    insights.push(`Healthy link growth rate (${monthlyGrowth.toFixed(1)}% monthly)`);
  } else if (monthlyGrowth >= 1) {
    score = 15;
    insights.push(`Modest link growth rate (${monthlyGrowth.toFixed(1)}% monthly)`);
  } else if (monthlyGrowth > 0) {
    score = 10;
    insights.push(`Slow link growth rate (${monthlyGrowth.toFixed(1)}% monthly) - acceleration needed`);
  } else {
    score = 0;
    insights.push('Link profile is stagnant or declining - immediate attention required');
  }

  details.growthMetrics = {
    monthlyGrowthRate: monthlyGrowth,
    annualizedGrowth: monthlyGrowth * 12
  };

  return score;
}

function calculateCompetitiveScore(
  data: AuthorityLinksData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // Compare to competitor average - up to 15 points
  const competitorRatio = data.totalLinks / data.competitorAverage;
  if (competitorRatio >= 1.5) {
    score += 15;
    insights.push('Significantly outperforming competitors in link acquisition');
  } else if (competitorRatio >= 1.0) {
    score += 10;
    insights.push('Matching or exceeding competitor link profiles');
  } else if (competitorRatio >= 0.5) {
    score += 5;
    insights.push('Below competitor average - opportunity to gain market share');
  } else {
    score += 0;
    insights.push('Significantly behind competitors - aggressive strategy needed');
  }

  // Compare to industry benchmark - up to 15 points
  const benchmarkRatio = data.totalLinks / data.industryBenchmark;
  if (benchmarkRatio >= 1.2) {
    score += 15;
    insights.push('Exceeding industry benchmarks for your spend level');
  } else if (benchmarkRatio >= 0.8) {
    score += 10;
    insights.push('Meeting industry benchmarks for your spend level');
  } else if (benchmarkRatio >= 0.5) {
    score += 5;
    insights.push('Below industry benchmarks - ROI improvement possible');
  } else {
    score += 0;
    insights.push('Far below industry benchmarks - campaign effectiveness concerns');
  }

  details.competitiveMetrics = {
    competitorRatio,
    benchmarkRatio,
    competitorGap: data.competitorAverage - data.totalLinks,
    benchmarkGap: data.industryBenchmark - data.totalLinks
  };

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

function generateOverallInsights(
  score: number,
  data: AuthorityLinksData,
  insights: string[]
): void {
  // Add strategic recommendations based on score
  if (score < 30) {
    insights.push('CRITICAL: Link building strategy requires immediate overhaul');
    insights.push('Consider: Guest posting, digital PR, and resource page outreach');
  } else if (score < 50) {
    insights.push('Link building efforts need significant improvement');
    insights.push('Focus on acquiring more high-authority links and increasing velocity');
  } else if (score < 70) {
    insights.push('Link profile is developing but has room for optimization');
    insights.push('Target more DR 70+ domains and maintain consistent growth');
  } else {
    insights.push('Strong link building performance - maintain momentum');
    insights.push('Continue diversifying link sources and targeting premium domains');
  }

  // Calculate potential missed links based on competitor gap
  if (data.competitorAverage > data.totalLinks) {
    const missedLinks = Math.round(data.competitorAverage - data.totalLinks);
    insights.push(`Opportunity: Acquire ${missedLinks} more links to match competitors`);
  }
} 