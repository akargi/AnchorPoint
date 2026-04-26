import {
  ScheduledReportConfig,
  ReportScheduleFrequency,
  DistributionConfig,
  DistributionChannel,
  EmailDistributionConfig,
  WebhookDistributionConfig,
} from '../types/reporting.types';
import { RedisService } from './redis.service';
import logger from '../utils/logger';

/**
 * Service for scheduling reports and managing distributions
 */
export class ReportSchedulingService {
  private readonly SCHEDULE_PREFIX = 'report_schedule:';
  private readonly DISTRIBUTION_PREFIX = 'report_distribution:';
  private readonly EXECUTION_QUEUE = 'report_execution_queue';
  private schedules: Map<string, ScheduledReportConfig> = new Map();
  private distributions: Map<string, DistributionConfig> = new Map();

  constructor(private redis?: RedisService) {
    this.initializeSchedules();
  }

  /**
   * Initialize schedules from Redis
   */
  private async initializeSchedules(): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      logger.info('Initializing report schedules...');
      // Load all schedules from Redis
      // Implementation would depend on Redis client API
    } catch (error) {
      logger.error('Error initializing schedules:', error);
    }
  }

  /**
   * Create a scheduled report
   */
  async createSchedule(config: ScheduledReportConfig): Promise<void> {
    try {
      this.schedules.set(config.reportId, config);

      if (this.redis) {
        const key = `${this.SCHEDULE_PREFIX}${config.reportId}`;
        await this.redis.setJSON(key, config);
      }

      logger.info(
        `Report schedule created for ${config.reportId}: ${config.frequency}`
      );

      // Calculate next execution
      await this.scheduleNextExecution(config);
    } catch (error) {
      logger.error(`Error creating schedule for ${config.reportId}:`, error);
      throw error;
    }
  }

  /**
   * Update a scheduled report
   */
  async updateSchedule(reportId: string, config: Partial<ScheduledReportConfig>): Promise<void> {
    try {
      const existing = this.schedules.get(reportId);
      if (!existing) {
        throw new Error(`Schedule not found for report: ${reportId}`);
      }

      const updated = { ...existing, ...config };
      this.schedules.set(reportId, updated);

      if (this.redis) {
        const key = `${this.SCHEDULE_PREFIX}${reportId}`;
        await this.redis.setJSON(key, updated);
      }

      logger.info(`Report schedule updated for ${reportId}`);
    } catch (error) {
      logger.error(`Error updating schedule for ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a scheduled report
   */
  async deleteSchedule(reportId: string): Promise<void> {
    try {
      this.schedules.delete(reportId);

      if (this.redis) {
        const key = `${this.SCHEDULE_PREFIX}${reportId}`;
        await this.redis.del(key);
      }

      logger.info(`Report schedule deleted for ${reportId}`);
    } catch (error) {
      logger.error(`Error deleting schedule for ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Get schedule by report ID
   */
  async getSchedule(reportId: string): Promise<ScheduledReportConfig | null> {
    try {
      return this.schedules.get(reportId) || null;
    } catch (error) {
      logger.error(`Error retrieving schedule for ${reportId}:`, error);
      return null;
    }
  }

  /**
   * List all schedules
   */
  async listSchedules(): Promise<ScheduledReportConfig[]> {
    return Array.from(this.schedules.values());
  }

  /**
   * Schedule next execution of a report
   */
  private async scheduleNextExecution(config: ScheduledReportConfig): Promise<void> {
    try {
      const nextExecutionTime = this.calculateNextExecutionTime(config);
      const delayMs = nextExecutionTime.getTime() - Date.now();

      if (delayMs > 0) {
        logger.info(
          `Next execution for ${config.reportId} scheduled at ${nextExecutionTime.toISOString()}`
        );

        // Queue the execution
        if (this.redis) {
          const queueKey = `${this.EXECUTION_QUEUE}:${config.reportId}`;
          await this.redis.setJSON(
            queueKey,
            {
              reportId: config.reportId,
              scheduledFor: nextExecutionTime,
              retries: 0,
            },
            Math.ceil(delayMs / 1000)
          );
        }
      }
    } catch (error) {
      logger.error(`Error scheduling next execution for ${config.reportId}:`, error);
    }
  }

  /**
   * Calculate next execution time based on schedule frequency
   */
  private calculateNextExecutionTime(config: ScheduledReportConfig): Date {
    const now = new Date();
    const time = config.time ? this.parseTime(config.time) : { hours: 0, minutes: 0 };

    let nextExecution = new Date(now);
    nextExecution.setHours(time.hours, time.minutes, 0, 0);

    switch (config.frequency) {
      case ReportScheduleFrequency.ONCE:
        // If time has passed, this is for future reference
        if (nextExecution <= now) {
          nextExecution.setDate(nextExecution.getDate() + 1);
        }
        break;

      case ReportScheduleFrequency.DAILY:
        // If time has passed today, schedule for tomorrow
        if (nextExecution <= now) {
          nextExecution.setDate(nextExecution.getDate() + 1);
        }
        break;

      case ReportScheduleFrequency.WEEKLY:
        // Find next occurrence of specified day
        const dayOfWeek = config.dayOfWeek || now.getDay();
        let daysUntilNext = dayOfWeek - now.getDay();
        if (daysUntilNext <= 0 || (daysUntilNext === 0 && nextExecution <= now)) {
          daysUntilNext += 7;
        }
        nextExecution.setDate(nextExecution.getDate() + daysUntilNext);
        break;

      case ReportScheduleFrequency.MONTHLY:
        // Find next occurrence of specified day of month
        const dayOfMonth = config.dayOfMonth || now.getDate();
        nextExecution.setDate(dayOfMonth);
        if (nextExecution <= now) {
          nextExecution.setMonth(nextExecution.getMonth() + 1);
        }
        break;

      case ReportScheduleFrequency.QUARTERLY:
        // Schedule for next quarter
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const nextQuarter = currentQuarter + 1;
        nextExecution.setMonth(nextQuarter * 3);
        nextExecution.setDate(1);
        if (nextExecution <= now) {
          nextExecution.setMonth(nextExecution.getMonth() + 3);
        }
        break;

      case ReportScheduleFrequency.ANNUALLY:
        // Schedule for next year on same date
        nextExecution.setFullYear(now.getFullYear() + 1);
        break;
    }

    return nextExecution;
  }

  /**
   * Parse time string in HH:mm format
   */
  private parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
  }

  /**
   * Create distribution channel
   */
  async createDistribution(config: DistributionConfig): Promise<void> {
    try {
      this.distributions.set(config.reportId, config);

      if (this.redis) {
        const key = `${this.DISTRIBUTION_PREFIX}${config.reportId}`;
        await this.redis.setJSON(key, config);
      }

      logger.info(`Distribution channel created for ${config.reportId}: ${config.channel}`);
    } catch (error) {
      logger.error(`Error creating distribution for ${config.reportId}:`, error);
      throw error;
    }
  }

  /**
   * Update distribution channel
   */
  async updateDistribution(
    reportId: string,
    config: Partial<DistributionConfig>
  ): Promise<void> {
    try {
      const existing = this.distributions.get(reportId);
      if (!existing) {
        throw new Error(`Distribution not found for report: ${reportId}`);
      }

      const updated = { ...existing, ...config };
      this.distributions.set(reportId, updated);

      if (this.redis) {
        const key = `${this.DISTRIBUTION_PREFIX}${reportId}`;
        await this.redis.setJSON(key, updated);
      }

      logger.info(`Distribution channel updated for ${reportId}`);
    } catch (error) {
      logger.error(`Error updating distribution for ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Delete distribution channel
   */
  async deleteDistribution(reportId: string): Promise<void> {
    try {
      this.distributions.delete(reportId);

      if (this.redis) {
        const key = `${this.DISTRIBUTION_PREFIX}${reportId}`;
        await this.redis.del(key);
      }

      logger.info(`Distribution channel deleted for ${reportId}`);
    } catch (error) {
      logger.error(`Error deleting distribution for ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Get distribution by report ID
   */
  async getDistribution(reportId: string): Promise<DistributionConfig | null> {
    try {
      return this.distributions.get(reportId) || null;
    } catch (error) {
      logger.error(`Error retrieving distribution for ${reportId}:`, error);
      return null;
    }
  }

  /**
   * List all distributions
   */
  async listDistributions(): Promise<DistributionConfig[]> {
    return Array.from(this.distributions.values());
  }

  /**
   * Send report via distribution channel
   */
  async distributeReport(
    reportId: string,
    filePath: string,
    fileContent: Buffer
  ): Promise<boolean> {
    try {
      const distribution = await this.getDistribution(reportId);
      if (!distribution || !distribution.enabled) {
        logger.warn(`Distribution not found or disabled for ${reportId}`);
        return false;
      }

      let success = false;

      switch (distribution.channel) {
        case DistributionChannel.EMAIL:
          success = await this.distributeViaEmail(
            reportId,
            filePath,
            fileContent,
            distribution.config as EmailDistributionConfig
          );
          break;

        case DistributionChannel.WEBHOOK:
          success = await this.distributeViaWebhook(
            reportId,
            filePath,
            fileContent,
            distribution.config as WebhookDistributionConfig
          );
          break;

        case DistributionChannel.S3:
          success = await this.distributeViaS3(
            reportId,
            filePath,
            fileContent,
            distribution.config
          );
          break;

        case DistributionChannel.SFTP:
          success = await this.distributeViaSFTP(
            reportId,
            filePath,
            fileContent,
            distribution.config
          );
          break;

        case DistributionChannel.API:
          success = await this.storeForAPIDownload(reportId, filePath, fileContent);
          break;

        case DistributionChannel.DASHBOARD:
          success = await this.storeForDashboard(reportId, filePath, fileContent);
          break;

        default:
          logger.warn(`Unknown distribution channel: ${distribution.channel}`);
      }

      if (success) {
        logger.info(`Report distributed via ${distribution.channel}: ${reportId}`);
      }

      return success;
    } catch (error) {
      logger.error(`Error distributing report ${reportId}:`, error);
      return false;
    }
  }

  /**
   * Distribute via email
   */
  private async distributeViaEmail(
    reportId: string,
    filePath: string,
    fileContent: Buffer,
    config: EmailDistributionConfig
  ): Promise<boolean> {
    try {
      // Email distribution would be implemented here
      // Using a service like SendGrid, AWS SES, or nodemailer
      logger.info(
        `Distributing report via email to: ${config.recipients.join(', ')}`
      );

      // Mock implementation
      return true;
    } catch (error) {
      logger.error('Error distributing via email:', error);
      return false;
    }
  }

  /**
   * Distribute via webhook
   */
  private async distributeViaWebhook(
    reportId: string,
    filePath: string,
    fileContent: Buffer,
    config: WebhookDistributionConfig
  ): Promise<boolean> {
    try {
      logger.info(`Distributing report via webhook: ${config.url}`);

      // Mock implementation
      return true;
    } catch (error) {
      logger.error('Error distributing via webhook:', error);
      return false;
    }
  }

  /**
   * Distribute via S3
   */
  private async distributeViaS3(
    reportId: string,
    filePath: string,
    fileContent: Buffer,
    config: any
  ): Promise<boolean> {
    try {
      logger.info(`Distributing report to S3: ${config.bucket}`);

      // S3 distribution would be implemented here
      // Using AWS SDK

      return true;
    } catch (error) {
      logger.error('Error distributing via S3:', error);
      return false;
    }
  }

  /**
   * Distribute via SFTP
   */
  private async distributeViaSFTP(
    reportId: string,
    filePath: string,
    fileContent: Buffer,
    config: any
  ): Promise<boolean> {
    try {
      logger.info(`Distributing report via SFTP: ${config.host}`);

      // SFTP distribution would be implemented here
      // Using ssh2-sftp-client or similar

      return true;
    } catch (error) {
      logger.error('Error distributing via SFTP:', error);
      return false;
    }
  }

  /**
   * Store for API download
   */
  private async storeForAPIDownload(
    reportId: string,
    filePath: string,
    fileContent: Buffer
  ): Promise<boolean> {
    try {
      if (this.redis) {
        const key = `report_download:${reportId}`;
        // Store file metadata and path
        await this.redis.setJSON(
          key,
          { filePath, size: fileContent.length, createdAt: new Date() },
          86400 // 24 hours
        );
      }
      return true;
    } catch (error) {
      logger.error('Error storing for API download:', error);
      return false;
    }
  }

  /**
   * Store for dashboard viewing
   */
  private async storeForDashboard(
    reportId: string,
    filePath: string,
    fileContent: Buffer
  ): Promise<boolean> {
    try {
      if (this.redis) {
        const key = `report_dashboard:${reportId}`;
        // Store report data for dashboard display
        await this.redis.setJSON(
          key,
          { filePath, metadata: { size: fileContent.length } },
          604800 // 7 days
        );
      }
      return true;
    } catch (error) {
      logger.error('Error storing for dashboard:', error);
      return false;
    }
  }
}
