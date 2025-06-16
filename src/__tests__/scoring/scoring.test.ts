import {
  calculateAuthorityLinksScore,
  calculateAuthorityDomainsScore,
  calculateTrafficGrowthScore,
  calculateRankingImprovementsScore,
  calculateAIVisibilityScore,
  calculateOverallScore,
  calculatePartialScore,
  AuthorityLinksData,
  AuthorityDomainsData,
  TrafficGrowthData,
  RankingImprovementsData,
  AIVisibilityData
} from '@/lib/scoring';

describe('Scoring Algorithms', () => {
  
  describe('Authority Links Scoring', () => {
    it('should calculate high score for excellent link profile', () => {
      const data: AuthorityLinksData = {
        totalLinks: 1200,
        highAuthorityLinks: 200,
        mediumAuthorityLinks: 400,
        lowAuthorityLinks: 600,
        linkGrowthRate: 8,
        competitorAverage: 800,
        industryBenchmark: 1000
      };

      const result = calculateAuthorityLinksScore(data);
      
      expect(result.score).toBeGreaterThan(70);
      expect(result.normalizedScore).toBeGreaterThanOrEqual(7);
      expect(result.insights).toContain('Excellent high-authority link profile (15%+ DR 70+ domains)');
    });

    it('should calculate low score for poor link profile', () => {
      const data: AuthorityLinksData = {
        totalLinks: 50,
        highAuthorityLinks: 2,
        mediumAuthorityLinks: 8,
        lowAuthorityLinks: 40,
        linkGrowthRate: 0.5,
        competitorAverage: 500,
        industryBenchmark: 400
      };

      const result = calculateAuthorityLinksScore(data);
      
      expect(result.score).toBeLessThan(30);
      expect(result.normalizedScore).toBeLessThanOrEqual(3);
      expect(result.insights).toContain('Low link volume - aggressive link building strategy required');
    });

    it('should handle zero links gracefully', () => {
      const data: AuthorityLinksData = {
        totalLinks: 0,
        highAuthorityLinks: 0,
        mediumAuthorityLinks: 0,
        lowAuthorityLinks: 0,
        linkGrowthRate: 0,
        competitorAverage: 500,
        industryBenchmark: 400
      };

      const result = calculateAuthorityLinksScore(data);
      
      expect(result.score).toBe(0);
      expect(result.normalizedScore).toBe(1);
    });
  });

  describe('Authority Domains Scoring', () => {
    it('should calculate high score for excellent domain diversity', () => {
      const data: AuthorityDomainsData = {
        uniqueDomains: 600,
        highAuthorityDomains: 120,
        mediumAuthorityDomains: 240,
        domainDiversity: 85,
        competitorAverage: 500,
        industryBenchmark: 550
      };

      const result = calculateAuthorityDomainsScore(data);
      
      expect(result.score).toBeGreaterThan(75);
      expect(result.normalizedScore).toBeGreaterThanOrEqual(8);
      expect(result.details.domainDistribution.total).toBe(600);
    });

    it('should penalize low domain diversity', () => {
      const data: AuthorityDomainsData = {
        uniqueDomains: 100,
        highAuthorityDomains: 5,
        mediumAuthorityDomains: 20,
        domainDiversity: 45,
        competitorAverage: 300,
        industryBenchmark: 250
      };

      const result = calculateAuthorityDomainsScore(data);
      
      expect(result.insights).toContain('Critical: Poor domain diversity increases penalty risk');
    });
  });

  describe('Traffic Growth Scoring', () => {
    it('should calculate high score for strong traffic growth', () => {
      const data: TrafficGrowthData = {
        currentMonthlyTraffic: 150000,
        trafficSixMonthsAgo: 75000,
        trafficTwelveMonthsAgo: 50000,
        growthRate: 200,
        consistencyScore: 85,
        competitorGrowthRate: 50,
        industryAverage: 75
      };

      const result = calculateTrafficGrowthScore(data);
      
      expect(result.score).toBeGreaterThan(80);
      expect(result.normalizedScore).toBeGreaterThanOrEqual(8);
      expect(result.insights).toContain('Outstanding traffic growth: 200% year-over-year');
    });

    it('should handle traffic decline appropriately', () => {
      const data: TrafficGrowthData = {
        currentMonthlyTraffic: 8000,
        trafficSixMonthsAgo: 10000,
        trafficTwelveMonthsAgo: 12000,
        growthRate: -33,
        consistencyScore: 40,
        competitorGrowthRate: 25,
        industryAverage: 20
      };

      const result = calculateTrafficGrowthScore(data);
      
      expect(result.score).toBeLessThan(30);
      expect(result.insights).toContain('Traffic decline detected - immediate optimization required');
    });
  });

  describe('Ranking Improvements Scoring', () => {
    it('should calculate high score for strong ranking performance', () => {
      const data: RankingImprovementsData = {
        totalKeywords: 500,
        keywordsInTop3: 100,
        keywordsInTop10: 200,
        keywordsInTop20: 300,
        averagePositionChange: 8,
        newRankingKeywords: 100,
        competitorComparison: {
          betterRankings: 150,
          worseRankings: 50,
          totalSharedKeywords: 200
        }
      };

      const result = calculateRankingImprovementsScore(data);
      
      expect(result.score).toBeGreaterThan(70);
      expect(result.details.rankingDistribution.percentages.top3).toBe(20);
      expect(result.insights).toContain('Excellent top 3 rankings: 20.0% of keywords');
    });

    it('should handle no shared keywords with competitors', () => {
      const data: RankingImprovementsData = {
        totalKeywords: 100,
        keywordsInTop3: 5,
        keywordsInTop10: 15,
        keywordsInTop20: 30,
        averagePositionChange: 2,
        newRankingKeywords: 10,
        competitorComparison: {
          betterRankings: 0,
          worseRankings: 0,
          totalSharedKeywords: 0
        }
      };

      const result = calculateRankingImprovementsScore(data);
      
      expect(result.insights).toContain('Limited keyword overlap with competitors - unique strategy detected');
    });
  });

  describe('AI Visibility Scoring', () => {
    it('should calculate high score for strong AI presence', () => {
      const data: AIVisibilityData = {
        brandMentions: 40,
        positiveSentiment: 92,
        recommendationRate: 55,
        competitorMentions: new Map([
          ['Competitor1', 30],
          ['Competitor2', 25],
          ['Competitor3', 20]
        ]),
        totalQueriesTested: 100,
        industryContext: 'Leading expert in the industry, trusted solution provider recommended by professionals'
      };

      const result = calculateAIVisibilityScore(data);
      
      expect(result.score).toBeGreaterThan(75);
      expect(result.normalizedScore).toBeGreaterThanOrEqual(8);
      expect(result.insights).toContain('Excellent AI visibility: mentioned in 40% of queries');
    });

    it('should handle no AI visibility', () => {
      const data: AIVisibilityData = {
        brandMentions: 0,
        positiveSentiment: 0,
        recommendationRate: 0,
        competitorMentions: new Map([
          ['Competitor1', 50],
          ['Competitor2', 45]
        ]),
        totalQueriesTested: 100,
        industryContext: 'Service provider in the industry'
      };

      const result = calculateAIVisibilityScore(data);
      
      expect(result.score).toBeLessThan(20);
      expect(result.insights).toContain('No AI visibility detected - brand not mentioned in any queries');
    });
  });

  describe('Overall Score Calculation', () => {
    it('should calculate weighted overall score correctly', () => {
      const authorityLinksData: AuthorityLinksData = {
        totalLinks: 800,
        highAuthorityLinks: 120,
        mediumAuthorityLinks: 300,
        lowAuthorityLinks: 380,
        linkGrowthRate: 5,
        competitorAverage: 700,
        industryBenchmark: 750
      };

      const authorityDomainsData: AuthorityDomainsData = {
        uniqueDomains: 400,
        highAuthorityDomains: 60,
        mediumAuthorityDomains: 160,
        domainDiversity: 75,
        competitorAverage: 350,
        industryBenchmark: 380
      };

      const trafficGrowthData: TrafficGrowthData = {
        currentMonthlyTraffic: 50000,
        trafficSixMonthsAgo: 35000,
        trafficTwelveMonthsAgo: 25000,
        growthRate: 100,
        consistencyScore: 75,
        competitorGrowthRate: 40,
        industryAverage: 50
      };

      const rankingImprovementsData: RankingImprovementsData = {
        totalKeywords: 300,
        keywordsInTop3: 45,
        keywordsInTop10: 90,
        keywordsInTop20: 150,
        averagePositionChange: 5,
        newRankingKeywords: 45,
        competitorComparison: {
          betterRankings: 100,
          worseRankings: 80,
          totalSharedKeywords: 180
        }
      };

      const aiVisibilityData: AIVisibilityData = {
        brandMentions: 25,
        positiveSentiment: 85,
        recommendationRate: 35,
        competitorMentions: new Map([['Competitor1', 30]]),
        totalQueriesTested: 100,
        industryContext: 'Trusted provider recommended by experts'
      };

      const result = calculateOverallScore(
        authorityLinksData,
        authorityDomainsData,
        trafficGrowthData,
        rankingImprovementsData,
        aiVisibilityData
      );

      expect(result.weightedScore).toBeGreaterThan(50);
      expect(result.normalizedScore).toBeGreaterThanOrEqual(5);
      expect(result.performanceLevel).toBe('Excellent');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify performance level correctly', () => {
      // Test data that should result in "Average" performance
      const authorityLinksData: AuthorityLinksData = {
        totalLinks: 200,
        highAuthorityLinks: 10,
        mediumAuthorityLinks: 40,
        lowAuthorityLinks: 150,
        linkGrowthRate: 2,
        competitorAverage: 400,
        industryBenchmark: 350
      };

      const authorityDomainsData: AuthorityDomainsData = {
        uniqueDomains: 150,
        highAuthorityDomains: 15,
        mediumAuthorityDomains: 45,
        domainDiversity: 60,
        competitorAverage: 250,
        industryBenchmark: 200
      };

      const trafficGrowthData: TrafficGrowthData = {
        currentMonthlyTraffic: 15000,
        trafficSixMonthsAgo: 12000,
        trafficTwelveMonthsAgo: 10000,
        growthRate: 50,
        consistencyScore: 65,
        competitorGrowthRate: 60,
        industryAverage: 55
      };

      const rankingImprovementsData: RankingImprovementsData = {
        totalKeywords: 150,
        keywordsInTop3: 15,
        keywordsInTop10: 30,
        keywordsInTop20: 60,
        averagePositionChange: 3,
        newRankingKeywords: 15,
        competitorComparison: {
          betterRankings: 40,
          worseRankings: 60,
          totalSharedKeywords: 100
        }
      };

      const aiVisibilityData: AIVisibilityData = {
        brandMentions: 10,
        positiveSentiment: 70,
        recommendationRate: 15,
        competitorMentions: new Map([['Competitor1', 20]]),
        totalQueriesTested: 100,
        industryContext: 'Service provider'
      };

      const result = calculateOverallScore(
        authorityLinksData,
        authorityDomainsData,
        trafficGrowthData,
        rankingImprovementsData,
        aiVisibilityData
      );

      expect(result.performanceLevel).toBe('Good');
      expect(result.recommendations).toContain('Good SEO performance with solid ROI - room for strategic improvements');
    });
  });

  describe('Partial Score Calculation', () => {
    it('should calculate partial score with missing data', () => {
      const partialData = {
        authorityLinks: {
          totalLinks: 500,
          highAuthorityLinks: 50,
          mediumAuthorityLinks: 150,
          lowAuthorityLinks: 300,
          linkGrowthRate: 3,
          competitorAverage: 400,
          industryBenchmark: 450
        } as AuthorityLinksData,
        trafficGrowth: {
          currentMonthlyTraffic: 25000,
          trafficSixMonthsAgo: 20000,
          trafficTwelveMonthsAgo: 15000,
          growthRate: 66,
          consistencyScore: 70,
          competitorGrowthRate: 50,
          industryAverage: 45
        } as TrafficGrowthData
        // Missing: authorityDomains, rankingImprovements, aiVisibility
      };

      const result = calculatePartialScore(partialData);

      expect(result.availableMetrics).toContain('Authority Links');
      expect(result.availableMetrics).toContain('Traffic Growth');
      expect(result.missingMetrics).toContain('Authority Domains');
      expect(result.missingMetrics).toContain('Ranking Improvements');
      expect(result.missingMetrics).toContain('AI Visibility');
      expect(result.confidence).toBeCloseTo(55, 5); // 0.35 + 0.20 = 0.55 = 55%
    });

    it('should handle empty data gracefully', () => {
      const result = calculatePartialScore({});

      expect(result.score).toBe(0);
      expect(result.normalizedScore).toBe(1);
      expect(result.confidence).toBe(0);
      expect(result.missingMetrics.length).toBe(5);
    });
  });
}); 