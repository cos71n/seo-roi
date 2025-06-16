import { AuthorityDomainsData, ScoreResult } from './types';

/**
 * Authority Domains Scoring Algorithm (20% weight)
 * 
 * Evaluates the quality and diversity of referring domains based on:
 * - Number of unique referring domains
 * - Distribution of domain authority levels
 * - Domain diversity (avoiding over-reliance on few domains)
 * - Comparison to competitors and industry standards
 */
export function calculateAuthorityDomainsScore(
  data: AuthorityDomainsData
): ScoreResult {
  const insights: string[] = [];
  const details: Record<string, any> = {};

  // Calculate domain volume score (0-30 points)
  const volumeScore = calculateVolumeScore(data, insights, details);

  // Calculate domain quality score (0-35 points)
  const qualityScore = calculateDomainQualityScore(data, insights, details);

  // Calculate diversity score (0-20 points)
  const diversityScore = calculateDiversityScore(data, insights, details);

  // Calculate competitive position score (0-15 points)
  const competitiveScore = calculateCompetitiveDomainsScore(data, insights, details);

  // Total raw score (0-100)
  const rawScore = volumeScore + qualityScore + diversityScore + competitiveScore;

  // Normalize to 1-10 scale
  const normalizedScore = normalizeScore(rawScore);

  // Add overall insights
  generateDomainInsights(rawScore, data, insights);

  return {
    score: rawScore,
    normalizedScore,
    details: {
      ...details,
      volumeScore,
      qualityScore,
      diversityScore,
      competitiveScore,
      domainDistribution: {
        highAuthority: data.highAuthorityDomains,
        mediumAuthority: data.mediumAuthorityDomains,
        lowAuthority: data.uniqueDomains - data.highAuthorityDomains - data.mediumAuthorityDomains,
        total: data.uniqueDomains
      }
    },
    insights
  };
}

function calculateVolumeScore(
  data: AuthorityDomainsData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // Unique domain count - up to 30 points
  if (data.uniqueDomains >= 500) {
    score = 30;
    insights.push(`Excellent domain diversity with ${data.uniqueDomains} unique referring domains`);
  } else if (data.uniqueDomains >= 250) {
    score = 25;
    insights.push(`Strong domain portfolio with ${data.uniqueDomains} unique referring domains`);
  } else if (data.uniqueDomains >= 100) {
    score = 20;
    insights.push(`Good domain count but room for growth (${data.uniqueDomains} domains)`);
  } else if (data.uniqueDomains >= 50) {
    score = 15;
    insights.push(`Moderate domain count - expansion recommended (${data.uniqueDomains} domains)`);
  } else if (data.uniqueDomains >= 25) {
    score = 10;
    insights.push(`Low domain count limiting SEO impact (${data.uniqueDomains} domains)`);
  } else {
    score = 5;
    insights.push(`Critical: Very low domain count (${data.uniqueDomains}) - immediate action needed`);
  }

  details.volumeMetrics = {
    uniqueDomains: data.uniqueDomains,
    monthlyGrowthNeeded: Math.max(0, 100 - data.uniqueDomains) / 6
  };

  return score;
}

function calculateDomainQualityScore(
  data: AuthorityDomainsData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // High authority domains (DR 70+) - up to 20 points
  const highAuthorityRatio = data.highAuthorityDomains / data.uniqueDomains;
  if (highAuthorityRatio >= 0.20) {
    score += 20;
    insights.push('Exceptional high-authority domain ratio (20%+ DR 70+)');
  } else if (highAuthorityRatio >= 0.15) {
    score += 16;
    insights.push('Strong high-authority domain presence (15-20% DR 70+)');
  } else if (highAuthorityRatio >= 0.10) {
    score += 12;
    insights.push('Good high-authority domain mix (10-15% DR 70+)');
  } else if (highAuthorityRatio >= 0.05) {
    score += 8;
    insights.push('Below-average high-authority domains - target premium sites');
  } else {
    score += 4;
    insights.push('Lacking high-authority domains - critical gap in link profile');
  }

  // Medium authority domains (DR 40-69) - up to 15 points
  const mediumAuthorityRatio = data.mediumAuthorityDomains / data.uniqueDomains;
  if (mediumAuthorityRatio >= 0.40) {
    score += 15;
  } else if (mediumAuthorityRatio >= 0.30) {
    score += 12;
  } else if (mediumAuthorityRatio >= 0.20) {
    score += 9;
  } else {
    score += 5;
  }

  details.qualityMetrics = {
    highAuthorityRatio,
    mediumAuthorityRatio,
    qualityScore: (highAuthorityRatio * 100 + mediumAuthorityRatio * 50) / 1.5
  };

  return score;
}

function calculateDiversityScore(
  data: AuthorityDomainsData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // Domain diversity percentage - up to 20 points
  if (data.domainDiversity >= 80) {
    score = 20;
    insights.push(`Excellent link diversity (${data.domainDiversity.toFixed(1)}% unique domains)`);
  } else if (data.domainDiversity >= 70) {
    score = 16;
    insights.push(`Good link diversity (${data.domainDiversity.toFixed(1)}% unique domains)`);
  } else if (data.domainDiversity >= 60) {
    score = 12;
    insights.push(`Acceptable diversity but some concentration risk`);
  } else if (data.domainDiversity >= 50) {
    score = 8;
    insights.push(`Low diversity - over-reliance on few domains`);
  } else {
    score = 4;
    insights.push(`Critical: Poor domain diversity increases penalty risk`);
  }

  // Calculate concentration risk
  const concentrationRisk = 100 - data.domainDiversity;
  if (concentrationRisk > 30) {
    insights.push(`Warning: ${concentrationRisk.toFixed(1)}% of links from limited domains`);
  }

  details.diversityMetrics = {
    domainDiversity: data.domainDiversity,
    concentrationRisk,
    diversificationNeeded: Math.max(0, 70 - data.domainDiversity)
  };

  return score;
}

function calculateCompetitiveDomainsScore(
  data: AuthorityDomainsData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // Compare to competitors - up to 8 points
  const competitorRatio = data.uniqueDomains / data.competitorAverage;
  if (competitorRatio >= 1.2) {
    score += 8;
    insights.push('Outperforming competitors in domain acquisition');
  } else if (competitorRatio >= 0.8) {
    score += 6;
    insights.push('Competitive with market leaders in domain count');
  } else if (competitorRatio >= 0.5) {
    score += 4;
    insights.push('Behind competitors - opportunity for market share gain');
  } else {
    score += 1;
    insights.push('Significantly trailing competitors in domain diversity');
  }

  // Compare to industry benchmark - up to 7 points
  const benchmarkRatio = data.uniqueDomains / data.industryBenchmark;
  if (benchmarkRatio >= 1.0) {
    score += 7;
    insights.push('Meeting or exceeding industry benchmarks');
  } else if (benchmarkRatio >= 0.7) {
    score += 5;
    insights.push('Approaching industry benchmarks for spend level');
  } else if (benchmarkRatio >= 0.5) {
    score += 3;
    insights.push('Below industry standards - efficiency improvements needed');
  } else {
    score += 0;
    insights.push('Far below industry benchmarks - strategic review required');
  }

  details.competitiveMetrics = {
    competitorRatio,
    benchmarkRatio,
    domainGap: Math.max(0, data.competitorAverage - data.uniqueDomains),
    benchmarkGap: Math.max(0, data.industryBenchmark - data.uniqueDomains)
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

function generateDomainInsights(
  score: number,
  data: AuthorityDomainsData,
  insights: string[]
): void {
  // Strategic recommendations based on score
  if (score < 30) {
    insights.push('URGENT: Domain profile severely underperforming');
    insights.push('Action: Launch outreach campaign targeting 20+ new domains monthly');
  } else if (score < 50) {
    insights.push('Domain acquisition needs significant acceleration');
    insights.push('Focus: Increase both quantity and quality of referring domains');
  } else if (score < 70) {
    insights.push('Domain profile developing - maintain growth momentum');
    insights.push('Priority: Target more DR 70+ domains for authority boost');
  } else {
    insights.push('Strong domain profile - optimize for quality over quantity');
    insights.push('Continue targeting high-authority, relevant domains');
  }

  // Specific domain acquisition targets
  if (data.uniqueDomains < data.competitorAverage) {
    const monthlyTarget = Math.ceil((data.competitorAverage - data.uniqueDomains) / 6);
    insights.push(`Target: Acquire ${monthlyTarget} new domains monthly to match competitors`);
  }

  // Quality improvement suggestions
  if (data.highAuthorityDomains < 20) {
    insights.push(`Opportunity: Focus on acquiring ${20 - data.highAuthorityDomains} more DR 70+ domains`);
  }
} 