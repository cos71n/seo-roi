// Types for SEO ROI Assessment Scoring System

export interface ScoreResult {
  score: number; // 0-100 raw score
  normalizedScore: number; // 1-10 normalized score
  details: Record<string, any>;
  insights: string[];
}

export interface AuthorityLinksData {
  totalLinks: number;
  highAuthorityLinks: number; // DR 70+
  mediumAuthorityLinks: number; // DR 40-69
  lowAuthorityLinks: number; // DR 0-39
  linkGrowthRate: number; // Monthly growth percentage
  competitorAverage: number;
  industryBenchmark: number;
}

export interface AuthorityDomainsData {
  uniqueDomains: number;
  highAuthorityDomains: number; // DR 70+
  mediumAuthorityDomains: number; // DR 40-69
  domainDiversity: number; // Percentage of unique domains
  competitorAverage: number;
  industryBenchmark: number;
}

export interface TrafficGrowthData {
  currentMonthlyTraffic: number;
  trafficSixMonthsAgo: number;
  trafficTwelveMonthsAgo: number;
  growthRate: number; // Percentage
  consistencyScore: number; // 0-100 based on month-to-month variance
  competitorGrowthRate: number;
  industryAverage: number;
}

export interface RankingImprovementsData {
  totalKeywords: number;
  keywordsInTop3: number;
  keywordsInTop10: number;
  keywordsInTop20: number;
  averagePositionChange: number;
  newRankingKeywords: number; // Keywords that weren't ranking before
  competitorComparison: {
    betterRankings: number;
    worseRankings: number;
    totalSharedKeywords: number;
  };
}

export interface AIVisibilityData {
  brandMentions: number; // Out of total queries tested
  positiveSentiment: number; // Percentage
  recommendationRate: number; // How often recommended as solution
  competitorMentions: Map<string, number>;
  totalQueriesTested: number;
  industryContext: string;
}

export interface OverallScoreData {
  authorityLinks: ScoreResult;
  authorityDomains: ScoreResult;
  trafficGrowth: ScoreResult;
  rankingImprovements: ScoreResult;
  aiVisibility: ScoreResult;
  weightedScore: number; // 0-100
  normalizedScore: number; // 1-10
  performanceLevel: 'Poor' | 'Below Average' | 'Average' | 'Good' | 'Excellent';
  recommendations: string[];
}

export interface ScoringWeights {
  authorityLinks: 0.35;
  authorityDomains: 0.20;
  trafficGrowth: 0.20;
  rankingImprovements: 0.15;
  aiVisibility: 0.10;
}

export interface CompetitorData {
  domain: string;
  metrics: {
    authorityLinks: AuthorityLinksData;
    authorityDomains: AuthorityDomainsData;
    trafficGrowth: TrafficGrowthData;
    rankings: RankingImprovementsData;
  };
}

export interface IndustryBenchmarks {
  industry: string;
  monthlySpendRange: {
    min: number;
    max: number;
  };
  expectedMetrics: {
    linkGrowthRate: number;
    domainGrowthRate: number;
    trafficGrowthRate: number;
    rankingImprovementRate: number;
  };
} 