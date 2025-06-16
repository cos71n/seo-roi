import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { AhrefsClient } from './api-clients/ahrefs.ts'
import { ClaudeClient } from './api-clients/claude.ts'
import { OpenAIClient } from './api-clients/openai.ts'
import { 
  calculateOverallScore,
  calculateAuthorityLinksScore,
  calculateAuthorityDomainsScore,
  calculateTrafficGrowthScore,
  calculateRankingImprovementsScore,
  calculateAIVisibilityScore
} from './scoring/index.ts'

export interface ReportGeneratorConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  ahrefsApiKey: string;
  claudeApiKey: string;
  openaiApiKey: string;
}

export class ReportGenerator {
  private supabase: any;
  private ahrefs: AhrefsClient;
  private claude: ClaudeClient;
  private openai: OpenAIClient;

  constructor(config: ReportGeneratorConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    this.ahrefs = new AhrefsClient(config.ahrefsApiKey);
    this.claude = new ClaudeClient(config.claudeApiKey);
    this.openai = new OpenAIClient(config.openaiApiKey);
  }

  async generateReport(reportId: string, userId: string, campaignId: string) {
    try {
      // 1. Get user and campaign data
      const { user, campaign } = await this.fetchUserAndCampaign(userId, campaignId);
      
      // 2. Update report status
      await this.updateReportStatus(reportId, 'processing', 'Fetching SEO data...');
      
      // 3. Fetch SEO data from Ahrefs
      const seoData = await this.fetchSEOData(user.domain, campaign);
      
      // 4. Find and analyze competitors
      await this.updateReportStatus(reportId, 'processing', 'Analyzing competitors...');
      const competitors = await this.findCompetitors(user.domain, campaign.target_keywords);
      const competitorData = await this.analyzeCompetitors(competitors);
      
      // 5. Perform AI visibility testing
      await this.updateReportStatus(reportId, 'processing', 'Testing AI visibility...');
      const aiVisibilityData = await this.testAIVisibility(
        user.domain,
        user.company_name,
        campaign.target_keywords
      );
      
      // 6. Calculate all scores
      await this.updateReportStatus(reportId, 'processing', 'Calculating scores...');
      const scores = this.calculateScores(seoData, competitorData, aiVisibilityData, campaign);
      
      // 7. Generate AI commentary
      await this.updateReportStatus(reportId, 'processing', 'Generating insights...');
      const commentary = await this.generateCommentary(
        user,
        campaign,
        scores,
        seoData,
        competitorData
      );
      
      // 8. Generate PDF report
      await this.updateReportStatus(reportId, 'processing', 'Creating PDF report...');
      const pdfUrl = await this.generatePDF(reportId, user, campaign, scores, commentary);
      
      // 9. Update report with all data
      await this.completeReport(reportId, scores, seoData, competitorData, aiVisibilityData, commentary, pdfUrl);
      
      return { success: true, reportId };
      
    } catch (error) {
      console.error('Report generation failed:', error);
      await this.failReport(reportId, error.message);
      throw error;
    }
  }

  private async fetchUserAndCampaign(userId: string, campaignId: string) {
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error(`User not found: ${userId}`);
    }

    const { data: campaign, error: campaignError } = await this.supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    return { user, campaign };
  }

  private async fetchSEOData(domain: string, campaign: any) {
    // Fetch comprehensive SEO data from Ahrefs
    const [backlinks, domains, traffic, rankings] = await Promise.all([
      this.ahrefs.getBacklinksData(domain, campaign.investment_duration),
      this.ahrefs.getRefDomainsData(domain, campaign.investment_duration),
      this.ahrefs.getTrafficData(domain, campaign.investment_duration),
      this.ahrefs.getRankingsData(domain, campaign.target_keywords)
    ]);

    return {
      backlinks,
      domains,
      traffic,
      rankings,
      historicalData: await this.ahrefs.getHistoricalData(domain, campaign.investment_duration)
    };
  }

  private async findCompetitors(domain: string, keywords: string[]) {
    // Use Ahrefs to find organic competitors
    const competitors = await this.ahrefs.findCompetitors(domain, keywords);
    
    // Return top 3-5 competitors
    return competitors.slice(0, 5);
  }

  private async analyzeCompetitors(competitors: any[]) {
    const competitorAnalysis = await Promise.all(
      competitors.map(async (competitor) => {
        const [domains, traffic, rankings] = await Promise.all([
          this.ahrefs.getRefDomainsData(competitor.domain, 12),
          this.ahrefs.getTrafficData(competitor.domain, 12),
          this.ahrefs.getCompetitorRankings(competitor.domain)
        ]);

        return {
          domain: competitor.domain,
          authorityDomains: domains.total,
          trafficGrowth: traffic.growthRate,
          topRankings: rankings.topPositions,
          contentThemes: await this.identifyContentThemes(competitor.domain)
        };
      })
    );

    return competitorAnalysis;
  }

  private async identifyContentThemes(domain: string) {
    // Analyze top performing pages to identify content themes
    const topPages = await this.ahrefs.getTopPages(domain);
    
    // Group by theme/topic
    const themes = this.groupByTheme(topPages);
    
    return themes;
  }

  private groupByTheme(pages: any[]) {
    // Simple theme grouping logic
    const themes: Record<string, any> = {};
    
    pages.forEach(page => {
      const theme = this.extractTheme(page.url, page.title);
      if (!themes[theme]) {
        themes[theme] = {
          name: theme,
          pages: [],
          totalTraffic: 0
        };
      }
      themes[theme].pages.push(page);
      themes[theme].totalTraffic += page.traffic_value;
    });

    return Object.values(themes).sort((a, b) => b.totalTraffic - a.totalTraffic);
  }

  private extractTheme(url: string, title: string) {
    // Extract theme from URL and title
    // This is simplified - real implementation would use NLP
    const segments = url.split('/').filter(s => s);
    if (segments.length > 1) {
      return segments[1]; // Category/theme is often in first URL segment
    }
    return 'general';
  }

  private async testAIVisibility(domain: string, companyName: string, keywords: string[]) {
    const results = await Promise.all(
      keywords.slice(0, 5).map(async (keyword) => {
        const response = await this.openai.testKeyword(keyword, domain, companyName);
        return {
          keyword,
          visibility: response.visibility,
          position: response.position,
          mentioned: response.mentioned,
          context: response.context
        };
      })
    );

    return {
      results,
      overallVisibility: this.calculateAIVisibilityPercentage(results)
    };
  }

  private calculateAIVisibilityPercentage(results: any[]) {
    const visible = results.filter(r => r.visibility !== 'not_visible').length;
    return (visible / results.length) * 100;
  }

  private calculateScores(seoData: any, competitorData: any[], aiVisibilityData: any, campaign: any) {
    const authorityLinksScore = calculateAuthorityLinksScore(
      seoData.backlinks,
      campaign.monthly_spend,
      campaign.investment_duration
    );

    const authorityDomainsScore = calculateAuthorityDomainsScore(
      seoData.domains.total,
      competitorData.map(c => c.authorityDomains)
    );

    const trafficGrowthScore = calculateTrafficGrowthScore(
      seoData.traffic,
      competitorData.map(c => ({ domain: c.domain, growth: c.trafficGrowth }))
    );

    const rankingScore = calculateRankingImprovementsScore(
      seoData.rankings,
      campaign.target_keywords
    );

    const aiScore = calculateAIVisibilityScore(
      aiVisibilityData.results
    );

    const overallScore = calculateOverallScore({
      authorityLinks: authorityLinksScore,
      authorityDomains: authorityDomainsScore,
      trafficGrowth: trafficGrowthScore,
      rankingImprovements: rankingScore,
      aiVisibility: aiScore
    });

    return {
      overall: overallScore,
      authorityLinks: authorityLinksScore,
      authorityDomains: authorityDomainsScore,
      trafficGrowth: trafficGrowthScore,
      rankings: rankingScore,
      aiVisibility: aiScore
    };
  }

  private async generateCommentary(
    user: any,
    campaign: any,
    scores: any,
    seoData: any,
    competitorData: any[]
  ) {
    const prompt = this.buildCommentaryPrompt(user, campaign, scores, seoData, competitorData);
    const commentary = await this.claude.generateCommentary(prompt);
    
    return {
      executive_summary: commentary.summary,
      score_interpretation: commentary.scoreAnalysis,
      key_wins: commentary.wins,
      improvement_areas: commentary.improvements,
      competitor_insights: commentary.competitorAnalysis,
      recommendations: commentary.recommendations,
      next_steps: commentary.nextSteps
    };
  }

  private buildCommentaryPrompt(user: any, campaign: any, scores: any, seoData: any, competitorData: any[]) {
    return {
      context: {
        company: user.company_name,
        domain: user.domain,
        industry: user.industry,
        monthlySpend: campaign.monthly_spend,
        investmentDuration: campaign.investment_duration,
        targetKeywords: campaign.target_keywords
      },
      scores,
      metrics: {
        currentBacklinks: seoData.backlinks.total,
        currentDomains: seoData.domains.total,
        trafficGrowth: seoData.traffic.growthRate,
        rankingImprovements: seoData.rankings.improvements
      },
      competitors: competitorData.map(c => ({
        domain: c.domain,
        authorityDomains: c.authorityDomains,
        trafficGrowth: c.trafficGrowth
      })),
      contentGaps: this.identifyContentGaps(seoData, competitorData)
    };
  }

  private identifyContentGaps(seoData: any, competitorData: any[]) {
    // Compare themes across competitors to find gaps
    const ourThemes = new Set(seoData.contentThemes?.map((t: any) => t.name) || []);
    const gaps: any[] = [];

    competitorData.forEach(competitor => {
      competitor.contentThemes?.forEach((theme: any) => {
        if (!ourThemes.has(theme.name) && theme.totalTraffic > 1000) {
          gaps.push({
            theme: theme.name,
            potentialTraffic: theme.totalTraffic,
            competitor: competitor.domain
          });
        }
      });
    });

    return gaps.sort((a, b) => b.potentialTraffic - a.potentialTraffic).slice(0, 5);
  }

  private async generatePDF(
    reportId: string,
    user: any,
    campaign: any,
    scores: any,
    commentary: any
  ) {
    // Generate PDF using a server-side PDF library
    // For now, we'll store a placeholder URL
    const pdfKey = `reports/${reportId}/seo-assessment-${user.domain}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    // TODO: Implement actual PDF generation
    // const pdfBuffer = await generatePDFBuffer(user, campaign, scores, commentary);
    // const { data, error } = await this.supabase.storage
    //   .from('reports')
    //   .upload(pdfKey, pdfBuffer, {
    //     contentType: 'application/pdf'
    //   });

    // For now, return a placeholder URL
    return `${this.supabase.supabaseUrl}/storage/v1/object/public/reports/${pdfKey}`;
  }

  private async updateReportStatus(reportId: string, status: string, message?: string) {
    await this.supabase
      .from('reports')
      .update({ 
        status,
        processing_message: message,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId);
  }

  private async completeReport(
    reportId: string,
    scores: any,
    seoData: any,
    competitorData: any[],
    aiVisibilityData: any,
    commentary: any,
    pdfUrl: string
  ) {
    await this.supabase
      .from('reports')
      .update({
        status: 'completed',
        processing_completed_at: new Date().toISOString(),
        overall_score: scores.overall.score,
        link_score: scores.authorityLinks.score,
        domain_score: scores.authorityDomains.score,
        traffic_score: scores.trafficGrowth.score,
        ranking_score: scores.rankings.score,
        ai_visibility_score: scores.aiVisibility.score,
        authority_domain_gap: Math.round(
          competitorData[0].authorityDomains - seoData.domains.total
        ),
        analysis_data: {
          seoMetrics: seoData,
          competitors: competitorData,
          scores: scores,
          contentGaps: this.identifyContentGaps(seoData, competitorData)
        },
        ai_visibility_data: aiVisibilityData,
        ai_commentary: JSON.stringify(commentary),
        pdf_url: pdfUrl
      })
      .eq('id', reportId);
  }

  private async failReport(reportId: string, errorMessage: string) {
    await this.supabase
      .from('reports')
      .update({
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId);
  }
} 