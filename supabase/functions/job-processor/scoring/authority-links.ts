import { AuthorityLinksData, ScoreResult, RedFlag, ScoringConfig } from './types';

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

/**
 * Authority Links Scoring Algorithm (35% weight)
 * Base Formula: $1,000/month = 1-2 authority links/month
 */
export function calculateAuthorityLinksScore(data: AuthorityLinksData): ScoreResult {
  const insights: string[] = [];
  const details: Record<string, any> = {};
  const redFlags: RedFlag[] = [];

  // Calculate expected links based on investment
  const expectedLinks = calculateExpectedLinks(data.monthlySpend, data.investmentMonths);
  
  // Calculate base score
  const percentage = (data.actualLinks / expectedLinks) * 100;
  const cappedPercentage = Math.min(percentage, 100); // Cap at 100% to prevent over-scoring
  
  // Convert to 1-10 scale
  let normalizedScore = Math.max(1, Math.min(10, cappedPercentage / 10));
  
  // Detect red flags
  const linkRedFlags = detectLinkBuildingRedFlags(data, expectedLinks);
  redFlags.push(...linkRedFlags);
  
  // Apply red flag penalties
  const totalPenalty = redFlags.reduce((sum, flag) => sum + flag.scorePenalty, 0);
  const adjustedScore = Math.max(1, normalizedScore + totalPenalty);
  
  // Generate insights
  generateLinkInsights(data, expectedLinks, percentage, insights);
  
  // Add details
  details.expectedLinks = expectedLinks;
  details.actualLinks = data.actualLinks;
  details.performancePercentage = percentage;
  details.monthlyLinkRate = data.actualLinks / data.investmentMonths;
  details.expectedMonthlyRate = expectedLinks / data.investmentMonths;
  
  if (data.linkBreakdown) {
    const total = data.linkBreakdown.highQuality + data.linkBreakdown.mediumQuality + data.linkBreakdown.lowQuality;
    details.qualityDistribution = {
      highQuality: total > 0 ? (data.linkBreakdown.highQuality / total) * 100 : 0,
      mediumQuality: total > 0 ? (data.linkBreakdown.mediumQuality / total) * 100 : 0,
      lowQuality: total > 0 ? (data.linkBreakdown.lowQuality / total) * 100 : 0
    };
  }

  return {
    score: cappedPercentage,
    normalizedScore: adjustedScore,
    adjustedScore: adjustedScore !== normalizedScore ? adjustedScore : undefined,
    details,
    insights,
    redFlags: redFlags.length > 0 ? redFlags : undefined
  };
}

function calculateExpectedLinks(monthlySpend: number, investmentMonths: number): number {
  const linksPerThousand = config.linksPerThousand;
  const expectedLinksPerMonth = (monthlySpend / 1000) * linksPerThousand;
  return Math.round(expectedLinksPerMonth * investmentMonths);
}

function detectLinkBuildingRedFlags(
  data: AuthorityLinksData, 
  expectedLinks: number
): RedFlag[] {
  const redFlags: RedFlag[] = [];
  
  // Red Flag 1: Severe link deficit after significant investment
  if (data.investmentMonths >= 12 && data.actualLinks < (expectedLinks * 0.3)) {
    redFlags.push({
      type: 'SEVERE_LINK_DEFICIT',
      severity: 'CRITICAL',
      message: `After ${data.investmentMonths} months, only ${data.actualLinks} authority links vs ${expectedLinks} expected. This suggests fundamental link building strategy failures.`,
      scorePenalty: -2
    });
  }
  
  // Red Flag 2: No recent link acquisition
  if (data.investmentMonths >= 6 && data.recentLinks6Months === 0) {
    redFlags.push({
      type: 'NO_RECENT_LINKS',
      severity: 'HIGH',
      message: 'No authority links acquired in the past 6 months despite ongoing SEO investment.',
      scorePenalty: -1.5
    });
  }
  
  // Red Flag 3: Poor link quality progression
  if (data.linkBreakdown) {
    const total = data.linkBreakdown.highQuality + data.linkBreakdown.mediumQuality + data.linkBreakdown.lowQuality;
    const lowQualityRatio = total > 0 ? data.linkBreakdown.lowQuality / total : 0;
    
    if (lowQualityRatio > 0.7) {
      redFlags.push({
        type: 'LOW_QUALITY_LINKS',
        severity: 'MEDIUM',
        message: `Over ${Math.round(lowQualityRatio * 100)}% of acquired links are from low-authority domains (DR <20).`,
        scorePenalty: -1
      });
    }
  }
  
  // Red Flag 4: Declining link velocity
  if (data.linkGrowthByMonth && data.linkGrowthByMonth.length >= 6) {
    const recentMonths = data.linkGrowthByMonth.slice(-3);
    const earlierMonths = data.linkGrowthByMonth.slice(-6, -3);
    const recentAvg = recentMonths.reduce((a, b) => a + b, 0) / 3;
    const earlierAvg = earlierMonths.reduce((a, b) => a + b, 0) / 3;
    
    if (earlierAvg > 0 && recentAvg < earlierAvg * 0.3) {
      redFlags.push({
        type: 'DECLINING_LINK_VELOCITY',
        severity: 'HIGH',
        message: 'Link acquisition rate has declined by over 70% in recent months.',
        scorePenalty: -1
      });
    }
  }
  
  return redFlags;
}

function generateLinkInsights(
  data: AuthorityLinksData,
  expectedLinks: number,
  percentage: number,
  insights: string[]
): void {
  const monthlyRate = data.actualLinks / data.investmentMonths;
  const expectedMonthlyRate = expectedLinks / data.investmentMonths;
  
  // Performance assessment
  if (percentage >= 80) {
    insights.push(`Strong link building performance: ${data.actualLinks} authority links acquired (${percentage.toFixed(0)}% of expected).`);
  } else if (percentage >= 60) {
    insights.push(`Good link acquisition: ${data.actualLinks} links, meeting ${percentage.toFixed(0)}% of expectations.`);
  } else if (percentage >= 40) {
    insights.push(`Below-target link building: ${data.actualLinks} links is only ${percentage.toFixed(0)}% of expected ${expectedLinks} links.`);
  } else {
    insights.push(`Poor link building results: ${data.actualLinks} links vs ${expectedLinks} expected (${percentage.toFixed(0)}%).`);
  }
  
  // Monthly rate comparison
  insights.push(`Current rate: ${monthlyRate.toFixed(1)} links/month vs expected ${expectedMonthlyRate.toFixed(1)} links/month.`);
  
  // Investment efficiency
  const costPerLink = (data.monthlySpend * data.investmentMonths) / data.actualLinks;
  if (data.actualLinks > 0) {
    insights.push(`Cost per authority link: $${Math.round(costPerLink).toLocaleString()}`);
  }
  
  // Quality insights
  if (data.linkBreakdown) {
    const highQualityPercentage = data.actualLinks > 0 
      ? (data.linkBreakdown.highQuality / data.actualLinks) * 100 
      : 0;
    
    if (highQualityPercentage >= 30) {
      insights.push(`Excellent link quality: ${highQualityPercentage.toFixed(0)}% are high-authority (DR 70+) domains.`);
    } else if (highQualityPercentage >= 15) {
      insights.push(`Good link quality mix with ${highQualityPercentage.toFixed(0)}% high-authority domains.`);
    } else {
      insights.push(`Link quality needs improvement: Only ${highQualityPercentage.toFixed(0)}% from high-authority domains.`);
    }
  }
  
  // Recommendations
  if (percentage < 60) {
    insights.push('Recommendation: Review link building strategy and tactics. Consider diversifying outreach methods.');
  }
  
  if (data.recentLinks6Months !== undefined && data.recentLinks6Months < 5) {
    insights.push('Alert: Link acquisition has stalled. Immediate strategy review needed.');
  }
} 