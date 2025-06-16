import { TrafficGrowthData, ScoreResult } from './types';

/**
 * Traffic Growth Scoring Algorithm (20% weight)
 * 
 * Evaluates organic traffic performance based on:
 * - Absolute traffic growth over 6 and 12 months
 * - Growth rate compared to competitors
 * - Consistency of month-to-month growth
 * - Alignment with industry benchmarks
 */
export function calculateTrafficGrowthScore(
  data: TrafficGrowthData
): ScoreResult {
  const insights: string[] = [];
  const details: Record<string, any> = {};

  // Calculate growth rate score (0-40 points)
  const growthRateScore = calculateGrowthRateScore(data, insights, details);

  // Calculate traffic volume score (0-20 points)
  const volumeScore = calculateTrafficVolumeScore(data, insights, details);

  // Calculate consistency score (0-20 points)
  const consistencyScore = calculateConsistencyScore(data, insights, details);

  // Calculate competitive performance score (0-20 points)
  const competitiveScore = calculateCompetitiveTrafficScore(data, insights, details);

  // Total raw score (0-100)
  const rawScore = growthRateScore + volumeScore + consistencyScore + competitiveScore;

  // Normalize to 1-10 scale
  const normalizedScore = normalizeScore(rawScore);

  // Add overall insights
  generateTrafficInsights(rawScore, data, insights);

  return {
    score: rawScore,
    normalizedScore,
    details: {
      ...details,
      growthRateScore,
      volumeScore,
      consistencyScore,
      competitiveScore,
      trafficTrends: {
        current: data.currentMonthlyTraffic,
        sixMonthsAgo: data.trafficSixMonthsAgo,
        twelveMonthsAgo: data.trafficTwelveMonthsAgo,
        sixMonthGrowth: calculateGrowthPercentage(data.trafficSixMonthsAgo, data.currentMonthlyTraffic),
        yearOverYearGrowth: calculateGrowthPercentage(data.trafficTwelveMonthsAgo, data.currentMonthlyTraffic)
      }
    },
    insights
  };
}

function calculateGrowthRateScore(
  data: TrafficGrowthData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // 12-month growth rate - up to 25 points
  const yearOverYearGrowth = calculateGrowthPercentage(data.trafficTwelveMonthsAgo, data.currentMonthlyTraffic);
  
  if (yearOverYearGrowth >= 100) {
    score += 25;
    insights.push(`Outstanding traffic growth: ${yearOverYearGrowth.toFixed(0)}% year-over-year`);
  } else if (yearOverYearGrowth >= 50) {
    score += 20;
    insights.push(`Excellent traffic growth: ${yearOverYearGrowth.toFixed(0)}% year-over-year`);
  } else if (yearOverYearGrowth >= 25) {
    score += 15;
    insights.push(`Strong traffic growth: ${yearOverYearGrowth.toFixed(0)}% year-over-year`);
  } else if (yearOverYearGrowth >= 10) {
    score += 10;
    insights.push(`Moderate traffic growth: ${yearOverYearGrowth.toFixed(0)}% year-over-year`);
  } else if (yearOverYearGrowth > 0) {
    score += 5;
    insights.push(`Slow traffic growth: ${yearOverYearGrowth.toFixed(0)}% - acceleration needed`);
  } else {
    score += 0;
    insights.push(`Traffic decline detected - immediate optimization required`);
  }

  // 6-month growth momentum - up to 15 points
  const sixMonthGrowth = calculateGrowthPercentage(data.trafficSixMonthsAgo, data.currentMonthlyTraffic);
  const monthlyGrowthRate = Math.pow(1 + sixMonthGrowth / 100, 1/6) - 1;
  
  if (monthlyGrowthRate >= 0.08) { // 8%+ monthly
    score += 15;
    insights.push(`Exceptional momentum: ${(monthlyGrowthRate * 100).toFixed(1)}% monthly growth rate`);
  } else if (monthlyGrowthRate >= 0.05) { // 5%+ monthly
    score += 12;
    insights.push(`Strong momentum: ${(monthlyGrowthRate * 100).toFixed(1)}% monthly growth rate`);
  } else if (monthlyGrowthRate >= 0.03) { // 3%+ monthly
    score += 9;
  } else if (monthlyGrowthRate >= 0.01) { // 1%+ monthly
    score += 6;
  } else {
    score += 2;
  }

  details.growthMetrics = {
    yearOverYearGrowth,
    sixMonthGrowth,
    monthlyGrowthRate: monthlyGrowthRate * 100,
    annualizedGrowth: Math.pow(1 + monthlyGrowthRate, 12) - 1
  };

  return score;
}

function calculateTrafficVolumeScore(
  data: TrafficGrowthData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // Absolute traffic volume - up to 20 points
  if (data.currentMonthlyTraffic >= 100000) {
    score = 20;
    insights.push(`High traffic volume: ${(data.currentMonthlyTraffic / 1000).toFixed(0)}K monthly visitors`);
  } else if (data.currentMonthlyTraffic >= 50000) {
    score = 16;
    insights.push(`Strong traffic volume: ${(data.currentMonthlyTraffic / 1000).toFixed(0)}K monthly visitors`);
  } else if (data.currentMonthlyTraffic >= 25000) {
    score = 12;
    insights.push(`Good traffic volume: ${(data.currentMonthlyTraffic / 1000).toFixed(0)}K monthly visitors`);
  } else if (data.currentMonthlyTraffic >= 10000) {
    score = 8;
    insights.push(`Moderate traffic: ${data.currentMonthlyTraffic.toLocaleString()} monthly visitors`);
  } else if (data.currentMonthlyTraffic >= 5000) {
    score = 5;
    insights.push(`Low traffic volume limiting growth potential`);
  } else {
    score = 2;
    insights.push(`Very low traffic - fundamental SEO improvements needed`);
  }

  // Calculate traffic potential
  const trafficPotential = Math.max(0, 25000 - data.currentMonthlyTraffic);
  if (trafficPotential > 0) {
    details.trafficPotential = {
      currentTraffic: data.currentMonthlyTraffic,
      targetTraffic: 25000,
      gap: trafficPotential,
      monthsToTarget: trafficPotential / (data.currentMonthlyTraffic * 0.05) // Assuming 5% monthly growth
    };
  }

  return score;
}

function calculateConsistencyScore(
  data: TrafficGrowthData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // Consistency score from data (0-100) - up to 20 points
  if (data.consistencyScore >= 80) {
    score = 20;
    insights.push('Excellent traffic consistency - stable upward trend');
  } else if (data.consistencyScore >= 70) {
    score = 16;
    insights.push('Good traffic consistency with minor fluctuations');
  } else if (data.consistencyScore >= 60) {
    score = 12;
    insights.push('Moderate consistency - some volatility in traffic');
  } else if (data.consistencyScore >= 50) {
    score = 8;
    insights.push('Inconsistent traffic patterns - stability improvements needed');
  } else {
    score = 4;
    insights.push('High traffic volatility indicates algorithm vulnerability');
  }

  // Check for concerning patterns
  const sixMonthGrowth = calculateGrowthPercentage(data.trafficSixMonthsAgo, data.currentMonthlyTraffic);
  const oldSixMonthGrowth = calculateGrowthPercentage(data.trafficTwelveMonthsAgo, data.trafficSixMonthsAgo);
  
  if (sixMonthGrowth < oldSixMonthGrowth * 0.5) {
    insights.push('Warning: Growth rate is decelerating significantly');
  }

  details.consistencyMetrics = {
    consistencyScore: data.consistencyScore,
    volatilityLevel: getVolatilityLevel(data.consistencyScore),
    growthDeceleration: oldSixMonthGrowth > 0 ? (oldSixMonthGrowth - sixMonthGrowth) / oldSixMonthGrowth : 0
  };

  return score;
}

function calculateCompetitiveTrafficScore(
  data: TrafficGrowthData,
  insights: string[],
  details: Record<string, any>
): number {
  let score = 0;

  // Compare growth rate to competitors - up to 10 points
  const growthDifference = data.growthRate - data.competitorGrowthRate;
  if (growthDifference >= 20) {
    score += 10;
    insights.push(`Significantly outpacing competitors (+${growthDifference.toFixed(0)}% growth differential)`);
  } else if (growthDifference >= 10) {
    score += 8;
    insights.push(`Outperforming competitors (+${growthDifference.toFixed(0)}% growth differential)`);
  } else if (growthDifference >= 0) {
    score += 6;
    insights.push('Matching or slightly exceeding competitor growth rates');
  } else if (growthDifference >= -10) {
    score += 4;
    insights.push('Slightly behind competitor growth rates');
  } else {
    score += 1;
    insights.push('Significantly lagging competitor traffic growth');
  }

  // Compare to industry average - up to 10 points
  const industryDifference = data.growthRate - data.industryAverage;
  if (industryDifference >= 15) {
    score += 10;
    insights.push('Far exceeding industry average growth rates');
  } else if (industryDifference >= 5) {
    score += 8;
    insights.push('Above industry average performance');
  } else if (industryDifference >= -5) {
    score += 6;
    insights.push('Meeting industry growth standards');
  } else {
    score += 3;
    insights.push('Below industry average - optimization opportunities exist');
  }

  details.competitiveMetrics = {
    growthRate: data.growthRate,
    competitorGrowthRate: data.competitorGrowthRate,
    industryAverage: data.industryAverage,
    growthDifferential: growthDifference,
    marketShareTrend: growthDifference > 0 ? 'gaining' : 'losing'
  };

  return score;
}

function calculateGrowthPercentage(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

function getVolatilityLevel(consistencyScore: number): string {
  if (consistencyScore >= 80) return 'Low';
  if (consistencyScore >= 60) return 'Moderate';
  if (consistencyScore >= 40) return 'High';
  return 'Very High';
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

function generateTrafficInsights(
  score: number,
  data: TrafficGrowthData,
  insights: string[]
): void {
  // Overall performance assessment
  if (score >= 80) {
    insights.push('EXCELLENT: Traffic growth is exceptional and sustainable');
    insights.push('Recommendation: Maintain current strategy while exploring new channels');
  } else if (score >= 60) {
    insights.push('GOOD: Traffic trending positively with room for acceleration');
    insights.push('Focus: Content expansion and technical SEO improvements');
  } else if (score >= 40) {
    insights.push('AVERAGE: Traffic growth needs strategic improvements');
    insights.push('Priority: Content quality, keyword targeting, and user experience');
  } else if (score >= 20) {
    insights.push('BELOW AVERAGE: Traffic performance indicates SEO issues');
    insights.push('Action: Comprehensive SEO audit and strategy overhaul needed');
  } else {
    insights.push('POOR: Traffic performance is critically low');
    insights.push('Urgent: Consider switching SEO providers or strategies');
  }

  // Calculate revenue impact
  if (data.currentMonthlyTraffic > 0) {
    const additionalTrafficNeeded = Math.max(0, data.industryAverage * data.currentMonthlyTraffic / 100);
    if (additionalTrafficNeeded > 100) {
      insights.push(`Revenue opportunity: ${Math.round(additionalTrafficNeeded).toLocaleString()} additional monthly visitors possible`);
    }
  }

  // Growth acceleration tips
  if (data.growthRate < 20) {
    insights.push('Consider: Long-tail keyword targeting, featured snippets optimization');
  }
} 