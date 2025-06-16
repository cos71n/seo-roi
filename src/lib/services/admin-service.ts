import { supabase } from './job-queue';
import { JobQueueService } from './job-queue';

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
}

export class AdminService {
  /**
   * Check if user is an admin
   */
  static async isAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', userId)
      .single();

    return !!data && !error;
  }

  /**
   * Get admin user details
   */
  static async getAdminUser(userId: string): Promise<AdminUser | null> {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.user_id,
      email: data.email,
      role: data.role
    };
  }

  /**
   * Regenerate a report
   */
  static async regenerateReport(
    reportId: string,
    adminUserId: string,
    priority: number = 2
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    // Verify admin access
    const isAdmin = await this.isAdmin(adminUserId);
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Get report details
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*, campaign:campaigns(*)')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return { success: false, error: 'Report not found' };
    }

    // Create audit log entry
    await this.createAuditLog(adminUserId, 'report_regenerate', {
      reportId,
      userId: report.user_id,
      campaignId: report.campaign_id
    });

    // Reset report status
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: 'queued',
        processing_started_at: null,
        processing_completed_at: null,
        error_message: null,
        regenerated_by: adminUserId,
        regenerated_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (updateError) {
      return { success: false, error: 'Failed to reset report status' };
    }

    // Enqueue new job with higher priority
    try {
      const jobId = await JobQueueService.enqueueReportGeneration(
        report.user_id,
        report.campaign_id,
        reportId,
        priority
      );

      return { success: true, jobId };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to enqueue job' 
      };
    }
  }

  /**
   * Get all reports with optional filters
   */
  static async getAllReports(filters?: {
    status?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('reports')
      .select(`
        *,
        user:users(*),
        campaign:campaigns(*)
      `, { count: 'exact' });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    query = query.order('created_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching reports:', error);
      return { reports: [], total: 0 };
    }

    return { reports: data || [], total: count || 0 };
  }

  /**
   * Get system statistics
   */
  static async getSystemStats() {
    const [
      totalReports,
      completedReports,
      failedReports,
      totalUsers,
      avgScore,
      recentJobs
    ] = await Promise.all([
      this.getReportCount(),
      this.getReportCount('completed'),
      this.getReportCount('failed'),
      this.getUserCount(),
      this.getAverageScore(),
      this.getRecentJobs(10)
    ]);

    return {
      reports: {
        total: totalReports,
        completed: completedReports,
        failed: failedReports,
        successRate: totalReports > 0 ? (completedReports / totalReports) * 100 : 0
      },
      users: {
        total: totalUsers
      },
      performance: {
        averageScore: avgScore
      },
      recentActivity: recentJobs
    };
  }

  /**
   * Helper: Get report count
   */
  private static async getReportCount(status?: string): Promise<number> {
    let query = supabase
      .from('reports')
      .select('id', { count: 'exact', head: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { count } = await query;
    return count || 0;
  }

  /**
   * Helper: Get user count
   */
  private static async getUserCount(): Promise<number> {
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    return count || 0;
  }

  /**
   * Helper: Get average score
   */
  private static async getAverageScore(): Promise<number> {
    const { data } = await supabase
      .from('reports')
      .select('overall_score')
      .eq('status', 'completed')
      .not('overall_score', 'is', null);

    if (!data || data.length === 0) return 0;

    const sum = data.reduce((acc, report) => acc + (report.overall_score || 0), 0);
    return Number((sum / data.length).toFixed(1));
  }

  /**
   * Helper: Get recent jobs
   */
  private static async getRecentJobs(limit: number) {
    const { data } = await supabase
      .from('job_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Create audit log entry
   */
  private static async createAuditLog(
    adminUserId: string,
    action: string,
    data: any
  ) {
    await supabase
      .from('audit_logs')
      .insert({
        admin_user_id: adminUserId,
        action,
        data,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Export reports to CSV
   */
  static async exportReportsCSV(filters?: any): Promise<string> {
    const { reports } = await this.getAllReports({ ...filters, limit: 1000 });

    // CSV header
    const headers = [
      'Report ID',
      'Company',
      'Domain',
      'Email',
      'Monthly Spend',
      'Overall Score',
      'Status',
      'Created At'
    ];

    // CSV rows
    const rows = reports.map(report => [
      report.id,
      report.user?.company_name || '',
      report.user?.domain || '',
      report.user?.email || '',
      report.campaign?.monthly_spend || '',
      report.overall_score || '',
      report.status,
      new Date(report.created_at).toLocaleString()
    ]);

    // Combine headers and rows
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }
} 