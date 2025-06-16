import { supabase } from './job-queue';

export interface NotificationOptions {
  reportId: string;
  userId: string;
  email: string;
  reportUrl: string;
}

export class NotificationService {
  /**
   * Send report completion notification
   */
  static async sendReportComplete(options: NotificationOptions) {
    // In a production environment, this would integrate with an email service
    // For now, we'll store the notification in the database
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: options.userId,
        type: 'report_complete',
        data: {
          reportId: options.reportId,
          reportUrl: options.reportUrl,
          email: options.email
        },
        sent_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to create notification:', error);
      return false;
    }

    // TODO: Integrate with email service (SendGrid, Postmark, etc.)
    console.log(`Report completion notification queued for ${options.email}`);
    
    return true;
  }

  /**
   * Subscribe to report status updates via WebSocket
   */
  static subscribeToReport(reportId: string, callback: (report: any) => void) {
    return supabase
      .channel(`report:${reportId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports',
          filter: `id=eq.${reportId}`
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  }

  /**
   * Check if user has enabled notifications
   */
  static async checkNotificationPreferences(userId: string) {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('email_notifications')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Default to enabled if no preferences found
      return { emailEnabled: true };
    }

    return {
      emailEnabled: data.email_notifications
    };
  }

  /**
   * Create in-app notification
   */
  static async createInAppNotification(
    userId: string,
    title: string,
    message: string,
    actionUrl?: string
  ) {
    const { error } = await supabase
      .from('in_app_notifications')
      .insert({
        user_id: userId,
        title,
        message,
        action_url: actionUrl,
        read: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to create in-app notification:', error);
      return false;
    }

    return true;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from('in_app_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    return !error;
  }

  /**
   * Get unread notifications for user
   */
  static async getUnreadNotifications(userId: string) {
    const { data, error } = await supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }

    return data || [];
  }
} 