// Types for SEO ROI Assessment Scoring System

export interface ScoreResult {
  score: number; // 0-100 raw score
  normalizedScore: number; // 1-10 normalized score
  details: Record<string, any>;
  insights: string[];
  redFlags?: RedFlag[];
  adjustedScore?: number; // Score after red flag penalties
  confidence?: 'High' | 'Medium' | 'Low';
}

export interface RedFlag {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  message: string;
  scorePenalty: number;
  missedRevenue?: number;
}

export interface AuthorityLinksData {
  actualLinks: number; // Total authority links acquired
  monthlySpend: number;
  investmentMonths: number;
  recentLinks6Months?: number;
  linkBreakdown?: {
    highQuality: number; // DR 70+
    mediumQuality: number; // DR 20-69
    lowQuality: number; // DR < 20
  };
  linkGrowthByMonth?: number[]; // Monthly link acquisition
}

export interface AuthorityDomainsData {
  clientDomains: number; // Client's authority domains
  competitorDomains: number[]; // Each competitor's authority domain count
  domainGrowthTrend?: number[]; // Monthly domain count
}

export interface TrafficGrowthData {
  clientGrowth: number; // Client's growth percentage
  competitorGrowths: number[]; // Each competitor's growth percentage
  investmentMonths: number;
  currentMonthlyTraffic: number;
  trafficHistory?: number[]; // Monthly traffic data
  brandedSearchTraffic?: number;
  topKeywordsDependency?: number; // % of traffic from top 10 keywords
}

export interface RankingImprovementsData {
  rankingChanges: RankingChange[];
  totalKeywords: number;
  investmentMonths: number;
}

export interface RankingChange {
  keyword: string;
  oldPosition: number; // >100 means not ranking
  newPosition: number; // >100 means not ranking
  searchVolume?: number;
  intent?: 'informational' | 'commercial' | 'transactional' | 'navigational';
}

export interface AIVisibilityData {
  keywordResults: AIKeywordResult[];
  investmentMonths: number;
}

export interface AIKeywordResult {
  keyword: string;
  mentioned: boolean;
  position?: number; // Position in AI response (1-10+)
  followUpMentioned?: boolean;
  brandRecognized?: boolean;
}

export interface ContentGapData {
  clientTraffic: Record<string, number>; // Traffic by theme
  competitorTrafficByTheme: CompetitorTheme[];
}

export interface CompetitorTheme {
  name: string;
  competitorAverage: number;
  intent?: 'commercial' | 'transactional' | 'informational';
}

export interface OverallScoreData {
  authorityLinks: ScoreResult;
  authorityDomains: ScoreResult;
  trafficGrowth: ScoreResult;
  rankingImprovements: ScoreResult;
  aiVisibility: ScoreResult;
  weightedScore: number; // 0-100
  normalizedScore: number; // 1-10
  performanceLevel: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Very Poor';
  recommendations: string[];
  redFlags: RedFlag[];
  confidence: 'High' | 'Medium' | 'Low';
}

export interface ScoringWeights {
  authorityLinks: 0.35;
  authorityDomains: 0.20;
  trafficGrowth: 0.20;
  rankingImprovements: 0.15;
  aiVisibility: 0.10;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export interface ScoringConfig {
  minMonthlySpend: 1000;
  minInvestmentMonths: 6;
  linksPerThousand: 1.5; // Average of 1-2 links per $1000/month
  authorityLinkCriteria: {
    minDR: 20;
    minMonthlyTraffic: 1000;
    targetGeos: string[]; // AU, US, UK, EU, NZ, CA
  };
}

// Industry benchmarks for different business types
export interface IndustryBenchmarks {
  industry: string;
  expectedMetrics: {
    linkGrowthRate: number;
    domainGrowthRate: number;
    trafficGrowthRate: number;
    rankingImprovementRate: number;
  };
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