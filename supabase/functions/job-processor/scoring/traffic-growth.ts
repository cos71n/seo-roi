import { TrafficGrowthData, ScoreResult, RedFlag } from './types';

/**
 * Traffic Growth Scoring Algorithm (20% weight)
 * Based on annualized growth rates compared to competitors
 */
export function calculateTrafficGrowthScore(data: TrafficGrowthData): ScoreResult {
  const insights: string[] = [];
  const details: Record<string, any> = {};
  const redFlags: RedFlag[] = [];

  // Annualize growth rates for fair comparison
  const annualizedClientGrowth = data.clientGrowth * (12 / data.investmentMonths);
  const averageCompetitorGrowth = data.competitorGrowths.reduce((sum, growth) => sum + growth, 0) / data.competitorGrowths.length;
  
  // Calculate relative performance
  const relativePerformance = averageCompetitorGrowth > 0 
    ? annualizedClientGrowth / averageCompetitorGrowth 
    : annualizedClientGrowth > 0 ? 2 : 0;
  
  // Score based on relative performance
  let normalizedScore: number;
  if (relativePerformance >= 1.5) {
    normalizedScore = 10; // 50% better than competitors
  } else if (relativePerformance >= 1.2) {
    normalizedScore = 8; // 20% better
  } else if (relativePerformance >= 0.8) {
    normalizedScore = 6; // Within 20% of competitors
  } else if (relativePerformance >= 0.5) {
    normalizedScore = 4; // 50% of competitor growth
  } else {
    normalizedScore = 2; // Less than 50% of competitor growth
  }
  
  // Detect red flags
  const trafficRedFlags = detectTrafficGrowthRedFlags(data, annualizedClientGrowth, averageCompetitorGrowth);
  redFlags.push(...trafficRedFlags);
  
  // Apply red flag penalties
  const totalPenalty = redFlags.reduce((sum, flag) => sum + flag.scorePenalty, 0);
  const adjustedScore = Math.max(1, normalizedScore + totalPenalty);
  
  // Generate insights
  generateTrafficInsights(data, annualizedClientGrowth, averageCompetitorGrowth, relativePerformance, insights);
  
  // Add details
  details.clientGrowth = data.clientGrowth;
  details.annualizedClientGrowth = annualizedClientGrowth;
  details.competitorGrowths = data.competitorGrowths;
  details.averageCompetitorGrowth = averageCompetitorGrowth;
  details.relativePerformance = relativePerformance;
  details.currentTraffic = data.currentMonthlyTraffic;
  
  // Add individual competitor comparison
  details.competitorComparison = data.competitorGrowths.map((growth, index) => ({
    competitor: `Competitor ${index + 1}`,
    growth: growth,
    clientRelativePerformance: growth > 0 ? (annualizedClientGrowth / growth) : 'N/A'
  }));
  
  // Traffic dependency analysis
  if (data.topKeywordsDependency !== undefined) {
    details.trafficConcentration = {
      topKeywordsDependency: data.topKeywordsDependency,
      riskLevel: data.topKeywordsDependency > 0.6 ? 'High' : data.topKeywordsDependency > 0.4 ? 'Medium' : 'Low'
    };
  }

  return {
    score: relativePerformance * 50, // Convert to 0-100 scale
    normalizedScore: adjustedScore,
    adjustedScore: adjustedScore !== normalizedScore ? adjustedScore : undefined,
    details,
    insights,
    redFlags: redFlags.length > 0 ? redFlags : undefined
  };
}

function detectTrafficGrowthRedFlags(
  data: TrafficGrowthData,
  annualizedClientGrowth: number,
  averageCompetitorGrowth: number
): RedFlag[] {
  const redFlags: RedFlag[] = [];
  
  // Red Flag 1: Falling behind competitors
  if (data.investmentMonths >= 8 && annualizedClientGrowth < (averageCompetitorGrowth * 0.5)) {
    redFlags.push({
      type: 'FALLING_BEHIND_COMPETITORS',
      severity: 'HIGH',
      message: `Your traffic growth (${annualizedClientGrowth.toFixed(0)}%) is less than half the competitor average (${averageCompetitorGrowth.toFixed(0)}%) despite ${data.investmentMonths} months of SEO investment.`,
      scorePenalty: -1.5
    });
  }
  
  // Red Flag 2: Stagnant or declining traffic
  if (data.investmentMonths >= 9 && annualizedClientGrowth <= 0) {
    redFlags.push({
      type: 'STAGNANT_PROGRESS',
      severity: 'HIGH',
      message: 'No significant improvements in traffic despite ongoing investment. Strategy needs immediate review.',
      scorePenalty: -1.5
    });
  }
  
  // Red Flag 3: Over-reliance on few keywords
  if (data.topKeywordsDependency && data.topKeywordsDependency > 0.6) {
    redFlags.push({
      type: 'KEYWORD_OVER_DEPENDENCY',
      severity: 'MEDIUM',
      message: `Over ${Math.round(data.topKeywordsDependency * 100)}% of traffic comes from less than 10 keywords. High risk if rankings drop.`,
      scorePenalty: -1
    });
  }
  
  // Red Flag 4: No branded search presence
  if (data.brandedSearchTraffic !== undefined && data.brandedSearchTraffic < 100 && data.investmentMonths >= 8) {
    redFlags.push({
      type: 'NO_BRAND_RECOGNITION',
      severity: 'MEDIUM',
      message: 'Minimal branded search traffic suggests poor brand building through SEO.',
      scorePenalty: -1
    });
  }
  
  // Red Flag 5: Declining momentum
  if (data.trafficHistory && data.trafficHistory.length >= 6) {
    const recentMonths = data.trafficHistory.slice(-3);
    const earlierMonths = data.trafficHistory.slice(-6, -3);
    const recentAvg = recentMonths.reduce((a, b) => a + b, 0) / 3;
    const earlierAvg = earlierMonths.reduce((a, b) => a + b, 0) / 3;
    
    if (earlierAvg > 0 && recentAvg < earlierAvg * 0.8) {
      redFlags.push({
        type: 'DECLINING_MOMENTUM',
        severity: 'HIGH',
        message: 'Traffic growth momentum has declined by over 20% in recent months.',
        scorePenalty: -1
      });
    }
  }
  
  return redFlags;
}

function generateTrafficInsights(
  data: TrafficGrowthData,
  annualizedClientGrowth: number,
  averageCompetitorGrowth: number,
  relativePerformance: number,
  insights: string[]
): void {
  // Performance assessment
  if (relativePerformance >= 1.5) {
    insights.push(`Excellent traffic growth: ${annualizedClientGrowth.toFixed(0)}% annualized vs competitor average of ${averageCompetitorGrowth.toFixed(0)}%.`);
  } else if (relativePerformance >= 1.2) {
    insights.push(`Strong growth performance: ${annualizedClientGrowth.toFixed(0)}% growth outpacing competitors by 20%.`);
  } else if (relativePerformance >= 0.8) {
    insights.push(`Competitive growth rate: ${annualizedClientGrowth.toFixed(0)}% is within range of competitor average.`);
  } else if (relativePerformance >= 0.5) {
    insights.push(`Below-average growth: ${annualizedClientGrowth.toFixed(0)}% is only ${(relativePerformance * 100).toFixed(0)}% of competitor performance.`);
  } else {
    insights.push(`Poor traffic growth: ${annualizedClientGrowth.toFixed(0)}% vs competitor average of ${averageCompetitorGrowth.toFixed(0)}%.`);
  }
  
  // Actual growth over investment period
  insights.push(`Actual growth: ${data.clientGrowth.toFixed(0)}% over ${data.investmentMonths} months.`);
  
  // Current traffic volume
  if (data.currentMonthlyTraffic >= 50000) {
    insights.push(`Strong traffic base: ${(data.currentMonthlyTraffic / 1000).toFixed(0)}K monthly visitors.`);
  } else if (data.currentMonthlyTraffic >= 10000) {
    insights.push(`Moderate traffic: ${data.currentMonthlyTraffic.toLocaleString()} monthly visitors with growth potential.`);
  } else {
    insights.push(`Low traffic volume: ${data.currentMonthlyTraffic.toLocaleString()} monthly visitors needs acceleration.`);
  }
  
  // Competitor comparison
  const ahead = data.competitorGrowths.filter(growth => annualizedClientGrowth > growth).length;
  const total = data.competitorGrowths.length;
  insights.push(`Outperforming ${ahead} of ${total} competitors in traffic growth rate.`);
  
  // Traffic concentration risk
  if (data.topKeywordsDependency !== undefined) {
    if (data.topKeywordsDependency > 0.5) {
      insights.push(`Risk: ${Math.round(data.topKeywordsDependency * 100)}% of traffic from top 10 keywords - diversification needed.`);
    } else {
      insights.push(`Good traffic diversity: ${Math.round(data.topKeywordsDependency * 100)}% from top 10 keywords.`);
    }
  }
  
  // Recommendations
  if (relativePerformance < 1.0) {
    insights.push('Priority: Accelerate content production and target high-volume keywords.');
  }
  
  if (data.currentMonthlyTraffic < 10000) {
    insights.push('Focus: Build topic authority in key service areas to drive traffic growth.');
  }
  
  // Growth projection
  if (annualizedClientGrowth > 0) {
    const projectedTraffic = data.currentMonthlyTraffic * Math.pow(1 + annualizedClientGrowth / 100, 1);
    insights.push(`Projection: ${Math.round(projectedTraffic).toLocaleString()} monthly visitors in 12 months at current growth rate.`);
  }
} 