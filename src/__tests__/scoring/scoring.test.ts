import {
  calculateAuthorityLinksScore,
  calculateAuthorityDomainsScore,
  calculateTrafficGrowthScore,
  calculateRankingImprovementsScore,
  calculateAIVisibilityScore,
  calculateOverallScore,
  validateScoreInputs,
  AuthorityLinksData,
  AuthorityDomainsData,
  TrafficGrowthData,
  RankingImprovementsData,
  AIVisibilityData
} from '../../lib/scoring';

describe('SEO ROI Scoring Algorithms', () => {
  describe('Authority Links Score', () => {
    it('should calculate perfect score for meeting expectations', () => {
      const data: AuthorityLinksData = {
        actualLinks: 60,
        monthlySpend: 3000,
        investmentMonths: 12,
        linkBreakdown: {
          highQuality: 20,
          mediumQuality: 30,
          lowQuality: 10
        }
      };

      const result = calculateAuthorityLinksScore(data);
      
      // Expected links: (3000/1000) * 1.5 * 12 = 54
      // Performance: 60/54 = 111%, capped at 100%
      // Score: 100/10 = 10
      expect(result.normalizedScore).toBe(10);
      expect(result.score).toBe(100);
      expect(result.details.expectedLinks).toBe(54);
    });

    it('should calculate moderate score for partial achievement', () => {
      const data: AuthorityLinksData = {
        actualLinks: 32,
        monthlySpend: 3000,
        investmentMonths: 12,
        linkBreakdown: {
          highQuality: 8,
          mediumQuality: 16,
          lowQuality: 8
        }
      };

      const result = calculateAuthorityLinksScore(data);
      
      // Expected: 54, Actual: 32, Performance: 59.3%
      expect(result.normalizedScore).toBeCloseTo(5.9, 1);
      expect(result.insights).toContain('Below-target link building: 32 links is only 59% of expected 54 links.');
    });

    it('should apply red flag penalties for severe underperformance', () => {
      const data: AuthorityLinksData = {
        actualLinks: 10,
        monthlySpend: 3000,
        investmentMonths: 15,
        recentLinks6Months: 0,
        linkBreakdown: {
          highQuality: 1,
          mediumQuality: 2,
          lowQuality: 7
        }
      };

      const result = calculateAuthorityLinksScore(data);
      
      // Expected: 67.5, Actual: 10, Performance: 14.8%
      // Base score: 1.48, with red flag penalties
      expect(result.redFlags).toBeDefined();
      expect(result.redFlags!.length).toBeGreaterThan(0);
      expect(result.adjustedScore).toBeDefined();
      expect(result.adjustedScore).toBeLessThan(result.score / 10);
    });

    it('should handle zero links edge case', () => {
      const data: AuthorityLinksData = {
        actualLinks: 0,
        monthlySpend: 2000,
        investmentMonths: 8
      };

      const result = calculateAuthorityLinksScore(data);
      expect(result.normalizedScore).toBe(1);
      expect(result.score).toBe(0);
    });
  });

  describe('Authority Domains Score', () => {
    it('should score based on competitive benchmarking', () => {
      const data: AuthorityDomainsData = {
        clientDomains: 65,
        competitorDomains: [78, 92, 65]
      };

      const result = calculateAuthorityDomainsScore(data);
      
      // Average competitor: 78.3, Client: 65, Performance: 83%
      expect(result.normalizedScore).toBe(10); // >=80% = 10
      expect(result.details.averageCompetitorDomains).toBe(78);
    });

    it('should score moderately for average performance', () => {
      const data: AuthorityDomainsData = {
        clientDomains: 38,
        competitorDomains: [78, 92, 65]
      };

      const result = calculateAuthorityDomainsScore(data);
      
      // Average: 78.3, Client: 38, Performance: 48.5%
      expect(result.normalizedScore).toBe(6); // 40-60% = 6
    });

    it('should apply red flags for massive gaps', () => {
      const data: AuthorityDomainsData = {
        clientDomains: 15,
        competitorDomains: [100, 120, 110],
        domainGrowthTrend: [14, 14, 15, 15, 15, 15]
      };

      const result = calculateAuthorityDomainsScore(data);
      
      // Average: 110, Client: 15, Performance: 13.6%
      expect(result.normalizedScore).toBe(1); // <20% = 2, with penalties = 1
      expect(result.redFlags).toBeDefined();
      expect(result.redFlags!.some(f => f.type === 'MASSIVE_AUTHORITY_GAP')).toBe(true);
    });
  });

  describe('Traffic Growth Score', () => {
    it('should calculate based on annualized growth comparison', () => {
      const data: TrafficGrowthData = {
        clientGrowth: 25,
        competitorGrowths: [30, 35, 25],
        investmentMonths: 8,
        currentMonthlyTraffic: 25000
      };

      const result = calculateTrafficGrowthScore(data);
      
      // Annualized client: 37.5%, Avg competitor: 30%
      // Relative performance: 1.25 (25% better)
      expect(result.normalizedScore).toBe(8); // 20% better = 8
    });

    it('should handle stagnant growth with penalties', () => {
      const data: TrafficGrowthData = {
        clientGrowth: 0,
        competitorGrowths: [40, 50, 45],
        investmentMonths: 12,
        currentMonthlyTraffic: 10000,
        topKeywordsDependency: 0.7
      };

      const result = calculateTrafficGrowthScore(data);
      
      // No growth vs 45% competitor average
      expect(result.normalizedScore).toBeLessThan(3);
      expect(result.redFlags).toBeDefined();
      expect(result.redFlags!.some(f => f.type === 'STAGNANT_PROGRESS')).toBe(true);
    });
  });

  describe('Ranking Improvements Score', () => {
    it('should calculate based on position value improvements', () => {
      const data: RankingImprovementsData = {
        rankingChanges: [
          { keyword: 'service near me', oldPosition: 15, newPosition: 4 },
          { keyword: 'best service', oldPosition: 25, newPosition: 8 },
          { keyword: 'service reviews', oldPosition: 5, newPosition: 2 }
        ],
        totalKeywords: 3,
        investmentMonths: 10
      };

      const result = calculateRankingImprovementsScore(data);
      
      // Total improvement value: 12, Total possible: 18
      // Performance: 66.7%
      expect(result.normalizedScore).toBeCloseTo(6.7, 1);
    });

    it('should handle declining rankings', () => {
      const data: RankingImprovementsData = {
        rankingChanges: [
          { keyword: 'main service', oldPosition: 5, newPosition: 12 },
          { keyword: 'service cost', oldPosition: 8, newPosition: 15 },
          { keyword: 'service provider', oldPosition: 3, newPosition: 7 }
        ],
        totalKeywords: 3,
        investmentMonths: 12
      };

      const result = calculateRankingImprovementsScore(data);
      
      // All rankings declined
      expect(result.normalizedScore).toBeLessThan(3);
      expect(result.redFlags).toBeDefined();
    });
  });

  describe('AI Visibility Score', () => {
    it('should score based on keyword mention positions', () => {
      const data: AIVisibilityData = {
        keywordResults: [
          { keyword: 'best service provider', mentioned: true, position: 3 },
          { keyword: 'service reviews', mentioned: true, position: 7 },
          { keyword: 'service cost', mentioned: false, followUpMentioned: true },
          { keyword: 'service near me', mentioned: false, brandRecognized: true },
          { keyword: 'quality service', mentioned: false }
        ],
        investmentMonths: 10
      };

      const result = calculateAIVisibilityScore(data);
      
      // Scores: 20 + 15 + 10 + 5 + 0 = 50/100 = 50%
      expect(result.normalizedScore).toBe(5);
      expect(result.details.totalScore).toBe(50);
    });

    it('should apply penalties for AI invisibility', () => {
      const data: AIVisibilityData = {
        keywordResults: [
          { keyword: 'service 1', mentioned: false },
          { keyword: 'service 2', mentioned: false },
          { keyword: 'service 3', mentioned: false },
          { keyword: 'service 4', mentioned: false },
          { keyword: 'service 5', mentioned: false, brandRecognized: true }
        ],
        investmentMonths: 12
      };

      const result = calculateAIVisibilityScore(data);
      
      // Only 5 points out of 100
      expect(result.normalizedScore).toBe(1);
      expect(result.redFlags).toBeDefined();
      expect(result.redFlags!.some(f => f.type === 'AI_INVISIBILITY')).toBe(true);
    });
  });

  describe('Overall Score Calculation', () => {
    it('should calculate weighted overall score correctly', () => {
      const authorityLinks: AuthorityLinksData = {
        actualLinks: 50,
        monthlySpend: 4000,
        investmentMonths: 10
      };

      const authorityDomains: AuthorityDomainsData = {
        clientDomains: 45,
        competitorDomains: [65, 70, 60]
      };

      const trafficGrowth: TrafficGrowthData = {
        clientGrowth: 45,
        competitorGrowths: [25, 30, 20],
        investmentMonths: 10,
        currentMonthlyTraffic: 30000
      };

      const rankingImprovements: RankingImprovementsData = {
        rankingChanges: [
          { keyword: 'test 1', oldPosition: 20, newPosition: 8 },
          { keyword: 'test 2', oldPosition: 50, newPosition: 15 }
        ],
        totalKeywords: 2,
        investmentMonths: 10
      };

      const aiVisibility: AIVisibilityData = {
        keywordResults: [
          { keyword: 'test', mentioned: true, position: 5 },
          { keyword: 'test 2', mentioned: false, followUpMentioned: true }
        ],
        investmentMonths: 10
      };

      const result = calculateOverallScore(
        authorityLinks,
        authorityDomains,
        trafficGrowth,
        rankingImprovements,
        aiVisibility
      );

      expect(result.normalizedScore).toBeGreaterThan(5);
      expect(result.normalizedScore).toBeLessThanOrEqual(10);
      expect(result.performanceLevel).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should validate minimum requirements', () => {
      const validation1 = validateScoreInputs({
        monthlySpend: 500,
        investmentMonths: 8
      });

      expect(validation1.isValid).toBe(false);
      expect(validation1.errors).toContain('Minimum $1000/month required for analysis');

      const validation2 = validateScoreInputs({
        monthlySpend: 2000,
        investmentMonths: 4
      });

      expect(validation2.isValid).toBe(false);
      expect(validation2.errors).toContain('Minimum 6 months investment required for analysis');
    });

    it('should detect high spend poor results red flag', () => {
      const authorityLinks: AuthorityLinksData = {
        actualLinks: 10,
        monthlySpend: 6000,
        investmentMonths: 12
      };

      const authorityDomains: AuthorityDomainsData = {
        clientDomains: 20,
        competitorDomains: [100, 120, 110]
      };

      const trafficGrowth: TrafficGrowthData = {
        clientGrowth: 5,
        competitorGrowths: [50, 60, 55],
        investmentMonths: 12,
        currentMonthlyTraffic: 5000
      };

      const rankingImprovements: RankingImprovementsData = {
        rankingChanges: [],
        totalKeywords: 50,
        investmentMonths: 12
      };

      const aiVisibility: AIVisibilityData = {
        keywordResults: [
          { keyword: 'test', mentioned: false },
          { keyword: 'test 2', mentioned: false }
        ],
        investmentMonths: 12
      };

      const result = calculateOverallScore(
        authorityLinks,
        authorityDomains,
        trafficGrowth,
        rankingImprovements,
        aiVisibility
      );

      expect(result.redFlags.some(f => f.type === 'HIGH_SPEND_POOR_RESULTS')).toBe(true);
      expect(result.performanceLevel).toBe('Very Poor');
    });
  });

  describe('Complete Example Calculation', () => {
    it('should match the documented example from specifications', () => {
      const authorityLinks: AuthorityLinksData = {
        actualLinks: 42,
        monthlySpend: 4000,
        investmentMonths: 10,
        linkBreakdown: {
          highQuality: 12,
          mediumQuality: 20,
          lowQuality: 10
        }
      };

      const authorityDomains: AuthorityDomainsData = {
        clientDomains: 38,
        competitorDomains: [65, 70, 60]
      };

      const trafficGrowth: TrafficGrowthData = {
        clientGrowth: 37.5, // 45% over 10 months = 54% annualized
        competitorGrowths: [25, 30, 20],
        investmentMonths: 10,
        currentMonthlyTraffic: 35000
      };

      const rankingImprovements: RankingImprovementsData = {
        rankingChanges: [
          { keyword: 'legal services', oldPosition: 15, newPosition: 8 },
          { keyword: 'lawyer near me', oldPosition: 25, newPosition: 12 },
          { keyword: 'attorney consultation', oldPosition: 50, newPosition: 18 }
        ],
        totalKeywords: 20,
        investmentMonths: 10
      };

      const aiVisibility: AIVisibilityData = {
        keywordResults: [
          { keyword: 'best lawyer', mentioned: true, position: 4 },
          { keyword: 'legal help', mentioned: true, position: 8 },
          { keyword: 'attorney services', mentioned: false, followUpMentioned: true },
          { keyword: 'law firm', mentioned: false },
          { keyword: 'legal advice', mentioned: false }
        ],
        investmentMonths: 10
      };

      const result = calculateOverallScore(
        authorityLinks,
        authorityDomains,
        trafficGrowth,
        rankingImprovements,
        aiVisibility
      );

      // Individual scores approximately:
      // Authority Links: 7.0 (42/60 = 70%)
      // Authority Domains: 5.8 (38/65 = 58%)
      // Traffic Growth: ~9 (excellent relative performance)
      // Ranking Improvements: varies based on calculation
      // AI Visibility: 6.0 (3/5 keywords with varying scores)

      expect(result.normalizedScore).toBeGreaterThan(6);
      expect(result.normalizedScore).toBeLessThan(8);
      expect(result.performanceLevel).toBe('Good');
    });
  });
}); 