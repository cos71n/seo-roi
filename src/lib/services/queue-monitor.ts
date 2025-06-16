import { supabase } from './job-queue';

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  avgProcessingTime: number;
  successRate: number;
}

export interface JobMetrics {
  jobId: string;
  jobType: string;
  status: string;
  processingTime?: number;
  retryCount: number;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class QueueMonitor {
  /**
   * Get overall queue statistics
   */
  static async getQueueStats(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<QueueStats> {
    const now = new Date();
    const startTime = new Date();
    
    switch (timeRange) {
      case 'hour':
        startTime.setHours(now.getHours() - 1);
        break;
      case 'day':
        startTime.setDate(now.getDate() - 1);
        break;
      case 'week':
        startTime.setDate(now.getDate() - 7);
        break;
    }

    const { data: jobs, error } = await supabase
      .from('job_queue')
      .select('status, created_at, started_at, completed_at')
      .gte('created_at', startTime.toISOString());

    if (error || !jobs) {
      console.error('Error fetching queue stats:', error);
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0,
        successRate: 0
      };
    }

    const stats = jobs.reduce(
      (acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        
        if (job.status === 'completed' && job.started_at && job.completed_at) {
          const processingTime = new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
          acc.totalProcessingTime += processingTime;
          acc.completedWithTime += 1;
        }
        
        return acc;
      },
      {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        totalProcessingTime: 0,
        completedWithTime: 0
      } as Record<string, number>
    );

    const avgProcessingTime = stats.completedWithTime > 0 
      ? stats.totalProcessingTime / stats.completedWithTime / 1000 // Convert to seconds
      : 0;

    const totalJobs = stats.completed + stats.failed;
    const successRate = totalJobs > 0 ? (stats.completed / totalJobs) * 100 : 0;

    return {
      pending: stats.pending,
      processing: stats.processing,
      completed: stats.completed,
      failed: stats.failed,
      avgProcessingTime,
      successRate
    };
  }

  /**
   * Get recent job metrics
   */
  static async getRecentJobs(limit: number = 20): Promise<JobMetrics[]> {
    const { data: jobs, error } = await supabase
      .from('job_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !jobs) {
      console.error('Error fetching recent jobs:', error);
      return [];
    }

    return jobs.map(job => ({
      jobId: job.id,
      jobType: job.job_type,
      status: job.status,
      processingTime: job.started_at && job.completed_at
        ? (new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000
        : undefined,
      retryCount: job.retry_count,
      errorMessage: job.error_message,
      createdAt: new Date(job.created_at),
      completedAt: job.completed_at ? new Date(job.completed_at) : undefined
    }));
  }

  /**
   * Get failed jobs that need attention
   */
  static async getFailedJobs(): Promise<JobMetrics[]> {
    const { data: jobs, error } = await supabase
      .from('job_queue')
      .select('*')
      .eq('status', 'failed')
      .gte('retry_count', 3) // Jobs that have exhausted retries
      .order('created_at', { ascending: false });

    if (error || !jobs) {
      console.error('Error fetching failed jobs:', error);
      return [];
    }

    return jobs.map(job => ({
      jobId: job.id,
      jobType: job.job_type,
      status: job.status,
      retryCount: job.retry_count,
      errorMessage: job.error_message,
      createdAt: new Date(job.created_at),
      completedAt: job.completed_at ? new Date(job.completed_at) : undefined
    }));
  }

  /**
   * Get jobs stuck in processing
   */
  static async getStuckJobs(thresholdMinutes: number = 10): Promise<JobMetrics[]> {
    const threshold = new Date();
    threshold.setMinutes(threshold.getMinutes() - thresholdMinutes);

    const { data: jobs, error } = await supabase
      .from('job_queue')
      .select('*')
      .eq('status', 'processing')
      .lt('started_at', threshold.toISOString());

    if (error || !jobs) {
      console.error('Error fetching stuck jobs:', error);
      return [];
    }

    return jobs.map(job => ({
      jobId: job.id,
      jobType: job.job_type,
      status: job.status,
      retryCount: job.retry_count,
      errorMessage: job.error_message,
      createdAt: new Date(job.created_at),
      processingTime: job.started_at
        ? (Date.now() - new Date(job.started_at).getTime()) / 1000
        : undefined
    }));
  }

  /**
   * Monitor queue health and return alerts
   */
  static async checkQueueHealth(): Promise<{
    healthy: boolean;
    alerts: string[];
  }> {
    const alerts: string[] = [];
    let healthy = true;

    // Check for high failure rate
    const stats = await this.getQueueStats('hour');
    if (stats.successRate < 80 && stats.completed + stats.failed > 10) {
      alerts.push(`High failure rate: ${(100 - stats.successRate).toFixed(1)}% of jobs failing`);
      healthy = false;
    }

    // Check for stuck jobs
    const stuckJobs = await this.getStuckJobs(10);
    if (stuckJobs.length > 0) {
      alerts.push(`${stuckJobs.length} jobs stuck in processing for >10 minutes`);
      healthy = false;
    }

    // Check for queue backup
    if (stats.pending > 50) {
      alerts.push(`Queue backup: ${stats.pending} jobs pending`);
      healthy = false;
    }

    // Check average processing time
    if (stats.avgProcessingTime > 300) { // 5 minutes
      alerts.push(`Slow processing: average time ${stats.avgProcessingTime.toFixed(0)}s`);
    }

    return { healthy, alerts };
  }

  /**
   * Get dead letter queue items
   */
  static async getDeadLetterQueue(): Promise<any[]> {
    const { data, error } = await supabase
      .from('job_queue_dead_letter')
      .select('*')
      .order('failed_at', { ascending: false });

    if (error) {
      console.error('Error fetching dead letter queue:', error);
      return [];
    }

    return data || [];
  }
} 