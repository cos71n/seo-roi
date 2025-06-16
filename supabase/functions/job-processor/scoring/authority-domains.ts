import { AuthorityDomainsData, ScoreResult, RedFlag } from './types';

/**
 * Authority Domains Scoring Algorithm (20% weight)
 * Based on competitive benchmarking against top 3 competitors
 */
export function calculateAuthorityDomainsScore(data: AuthorityDomainsData): ScoreResult {
  const insights: string[] = [];
  const details: Record<string, any> = {};
  const redFlags: RedFlag[] = [];

  // Calculate average competitor domains
  const averageCompetitorDomains = data.competitorDomains.reduce((sum, count) => sum + count, 0) / data.competitorDomains.length;
  
  // Calculate percentage relative to competitors
  const percentage = (data.clientDomains / averageCompetitorDomains) * 100;
  
  // Convert to 1-10 scale based on competitive position
  let normalizedScore: number;
  if (percentage >= 80) {
    normalizedScore = 10;
  } else if (percentage >= 60) {
    normalizedScore = 8;
  } else if (percentage >= 40) {
    normalizedScore = 6;
  } else if (percentage >= 20) {
    normalizedScore = 4;
  } else {
    normalizedScore = 2;
  }
  
  // Detect competitive position red flags
  const domainRedFlags = detectDomainRedFlags(data, averageCompetitorDomains, percentage);
  redFlags.push(...domainRedFlags);
  
  // Apply red flag penalties
  const totalPenalty = redFlags.reduce((sum, flag) => sum + flag.scorePenalty, 0);
  const adjustedScore = Math.max(1, normalizedScore + totalPenalty);
  
  // Generate insights
  generateDomainInsights(data, averageCompetitorDomains, percentage, insights);
  
  // Add details
  details.clientDomains = data.clientDomains;
  details.competitorDomains = data.competitorDomains;
  details.averageCompetitorDomains = Math.round(averageCompetitorDomains);
  details.performancePercentage = percentage;
  details.domainGap = Math.max(0, Math.round(averageCompetitorDomains - data.clientDomains));
  
  // Add individual competitor comparison
  details.competitorComparison = data.competitorDomains.map((domains, index) => ({
    competitor: `Competitor ${index + 1}`,
    domains: domains,
    clientRatio: (data.clientDomains / domains) * 100
  }));

  return {
    score: percentage,
    normalizedScore: adjustedScore,
    adjustedScore: adjustedScore !== normalizedScore ? adjustedScore : undefined,
    details,
    insights,
    redFlags: redFlags.length > 0 ? redFlags : undefined
  };
}

function detectDomainRedFlags(
  data: AuthorityDomainsData,
  averageCompetitorDomains: number,
  percentage: number
): RedFlag[] {
  const redFlags: RedFlag[] = [];
  
  // Red Flag: Massive authority domain gap
  if (percentage < 30) {
    redFlags.push({
      type: 'MASSIVE_AUTHORITY_GAP',
      severity: 'CRITICAL',
      message: `You have ${data.clientDomains} authority domains vs competitor average of ${Math.round(averageCompetitorDomains)}. This ${Math.round(100 - percentage)}% gap suggests ineffective link building strategy.`,
      scorePenalty: -2
    });
  }
  
  // Red Flag: Stagnant domain growth
  if (data.domainGrowthTrend && data.domainGrowthTrend.length >= 6) {
    const recentMonths = data.domainGrowthTrend.slice(-3);
    const earlierMonths = data.domainGrowthTrend.slice(-6, -3);
    const recentAvg = recentMonths.reduce((a, b) => a + b, 0) / 3;
    const earlierAvg = earlierMonths.reduce((a, b) => a + b, 0) / 3;
    
    if (recentAvg <= earlierAvg) {
      redFlags.push({
        type: 'STAGNANT_DOMAIN_GROWTH',
        severity: 'HIGH',
        message: 'No growth in referring domains over the past 3 months. Link building efforts appear ineffective.',
        scorePenalty: -1.5
      });
    }
  }
  
  // Red Flag: All competitors significantly ahead
  const allCompetitorsAhead = data.competitorDomains.every(count => data.clientDomains < count * 0.5);
  if (allCompetitorsAhead) {
    redFlags.push({
      type: 'BEHIND_ALL_COMPETITORS',
      severity: 'HIGH',
      message: 'You have less than 50% of the authority domains compared to ALL competitors. Major competitive disadvantage.',
      scorePenalty: -1
    });
  }
  
  return redFlags;
}

function generateDomainInsights(
  data: AuthorityDomainsData,
  averageCompetitorDomains: number,
  percentage: number,
  insights: string[]
): void {
  // Performance assessment
  if (percentage >= 80) {
    insights.push(`Strong competitive position: ${data.clientDomains} authority domains vs competitor average of ${Math.round(averageCompetitorDomains)}.`);
  } else if (percentage >= 60) {
    insights.push(`Competitive domain profile: ${data.clientDomains} domains is ${percentage.toFixed(0)}% of competitor average.`);
  } else if (percentage >= 40) {
    insights.push(`Below average: ${data.clientDomains} domains is only ${percentage.toFixed(0)}% of competitor average (${Math.round(averageCompetitorDomains)}).`);
  } else {
    insights.push(`Weak domain profile: ${data.clientDomains} domains vs competitor average of ${Math.round(averageCompetitorDomains)} (${percentage.toFixed(0)}%).`);
  }
  
  // Gap analysis
  const domainGap = averageCompetitorDomains - data.clientDomains;
  if (domainGap > 0) {
    insights.push(`Domain gap: Need ${Math.round(domainGap)} more authority domains to match competitor average.`);
  }
  
  // Competitor comparison
  const ahead = data.competitorDomains.filter(count => data.clientDomains > count).length;
  const total = data.competitorDomains.length;
  insights.push(`Outperforming ${ahead} of ${total} competitors in authority domain count.`);
  
  // Growth insights
  if (data.domainGrowthTrend && data.domainGrowthTrend.length >= 3) {
    const recentGrowth = data.domainGrowthTrend[data.domainGrowthTrend.length - 1] - data.domainGrowthTrend[data.domainGrowthTrend.length - 4];
    const monthlyGrowthRate = recentGrowth / 3;
    
    if (monthlyGrowthRate > 5) {
      insights.push(`Good momentum: Adding ${monthlyGrowthRate.toFixed(1)} new domains per month.`);
    } else if (monthlyGrowthRate > 0) {
      insights.push(`Slow growth: Only ${monthlyGrowthRate.toFixed(1)} new domains per month.`);
    } else {
      insights.push('Warning: No recent growth in referring domains.');
    }
  }
  
  // Recommendations
  if (percentage < 60) {
    insights.push('Priority: Accelerate domain acquisition through diversified link building tactics.');
  }
  
  if (domainGap > 20) {
    const monthsToClose = Math.ceil(domainGap / 5); // Assuming 5 new domains per month target
    insights.push(`Target: Acquire 5+ new authority domains monthly to close gap in ${monthsToClose} months.`);
  }
} 