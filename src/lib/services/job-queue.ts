import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface JobPayload {
  reportId: string;
  userId: string;
  campaignId: string;
}

export interface Job {
  id: string;
  job_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  payload: JobPayload;
  result?: any;
  error_message?: string;
  retry_count: number;
  scheduled_for: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export class JobQueueService {
  /**
   * Enqueue a new report generation job
   */
  static async enqueueReportGeneration(
    userId: string,
    campaignId: string,
    reportId: string,
    priority: number = 0
  ): Promise<string> {
    const { data, error } = await supabase.rpc('enqueue_job', {
      p_job_type: 'report_generation',
      p_payload: {
        reportId,
        userId,
        campaignId
      },
      p_priority: priority,
      p_created_by: userId
    });

    if (error) {
      console.error('Error enqueuing job:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get job status by job ID
   */
  static async getJobStatus(jobId: string): Promise<Job | null> {
    const { data, error } = await supabase
      .from('job_queue')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Error getting job status:', error);
      return null;
    }

    return data;
  }

  /**
   * Get all jobs for a user
   */
  static async getUserJobs(userId: string): Promise<Job[]> {
    const { data, error } = await supabase
      .from('job_queue')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting user jobs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Subscribe to job status changes
   */
  static subscribeToJob(
    jobId: string,
    callback: (job: Job) => void
  ) {
    return supabase
      .channel(`job:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'job_queue',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          callback(payload.new as Job);
        }
      )
      .subscribe();
  }

  /**
   * Trigger the job processor Edge Function
   * This would typically be called by a cron job or scheduled task
   */
  static async triggerJobProcessor(): Promise<boolean> {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/job-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error triggering job processor:', error);
      return false;
    }
  }

  /**
   * Get report by ID with job status
   */
  static async getReportWithStatus(reportId: string): Promise<any> {
    const { data: report, error } = await supabase
      .from('reports')
      .select(`
        *,
        user:users(*),
        campaign:campaigns(*)
      `)
      .eq('id', reportId)
      .single();

    if (error) {
      console.error('Error getting report:', error);
      throw error;
    }

    // Check if there's an active job for this report
    const { data: jobs } = await supabase
      .from('job_queue')
      .select('*')
      .eq('payload->reportId', reportId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      ...report,
      activeJob: jobs && jobs.length > 0 ? jobs[0] : null
    };
  }
} 