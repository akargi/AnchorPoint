import { randomUUID } from 'crypto';
import {
  ReportExecutionResult,
  ReportStatus,
  ReportBuilderConfig,
  ReportQueryOptions,
  ReportExecutionMetadata,
} from '../types/reporting.types';
import { ReportBuilderService } from './report-builder.service';
import { RedisService } from './redis.service';
import logger from '../utils/logger';

/**
 * Report execution service with caching and performance optimization
 */
export class ReportExecutionService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly EXECUTION_CACHE_PREFIX = 'report_exec:';
  private readonly METADATA_PREFIX = 'report_meta:';

  constructor(
    private reportBuilder: ReportBuilderService,
    private redis?: RedisService
  ) {}

  /**
   * Execute a report with caching
   */
  async executeReport(
    config: ReportBuilderConfig,
    options?: ReportQueryOptions,
    useCache: boolean = true
  ): Promise<ReportExecutionResult> {
    const executionId = randomUUID();
    const startTime = new Date();

    try {
      // Check cache
      if (useCache && this.redis) {
        const cached = await this.getCachedReport(config);
        if (cached) {
          logger.info(`Cache hit for report: ${config.name}`);
          return {
            reportId: executionId,
            executionId,
            status: ReportStatus.COMPLETED,
            startTime,
            endTime: new Date(),
            format: config.format,
            filePath: cached.filePath,
            downloadUrl: cached.downloadUrl,
            metadata: {
              cacheHit: true,
              reportType: config.type,
            },
          };
        }
      }

      logger.info(`Executing report: ${config.name} (ID: ${executionId})`);

      // Build the report
      const reportData = await this.reportBuilder.buildReport(config, options);

      // Calculate metrics
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const dataSize = JSON.stringify(reportData).length;

      const result: ReportExecutionResult = {
        reportId: executionId,
        executionId,
        status: ReportStatus.COMPLETED,
        startTime,
        endTime,
        rowsProcessed: reportData.rows.length,
        dataSize,
        format: config.format,
        metadata: {
          duration,
          rowsProcessed: reportData.rows.length,
          dataSize,
          cacheHit: false,
          reportType: config.type,
        },
      };

      // Cache the report
      if (useCache && this.redis) {
        await this.cacheReport(config, result);
      }

      // Store execution metadata
      await this.storeExecutionMetadata(executionId, {
        executionId,
        reportId: executionId,
        userId: 'system',
        startTime,
        endTime,
        duration: duration,
        rowsProcessed: reportData.rows.length,
        dataSize,
        cacheHit: false,
      });

      return result;
    } catch (error) {
      logger.error(`Error executing report '${config.name}':`, error);
      const endTime = new Date();

      const result: ReportExecutionResult = {
        reportId: executionId,
        executionId,
        status: ReportStatus.FAILED,
        startTime,
        endTime,
        format: config.format,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      await this.storeExecutionMetadata(executionId, {
        executionId,
        reportId: executionId,
        userId: 'system',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        rowsProcessed: 0,
        dataSize: 0,
        cacheHit: false,
      });

      return result;
    }
  }

  /**
   * Get cached report if available and still valid
   */
  private async getCachedReport(config: ReportBuilderConfig): Promise<any | null> {
    if (!this.redis) {
      return null;
    }

    try {
      const cacheKey = this.generateCacheKey(config);
      const cached = await this.redis.getJSON(cacheKey);
      return cached;
    } catch (error) {
      logger.warn('Error retrieving cached report:', error);
      return null;
    }
  }

  /**
   * Cache report result
   */
  private async cacheReport(config: ReportBuilderConfig, result: ReportExecutionResult): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const cacheKey = this.generateCacheKey(config);
      await this.redis.setJSON(cacheKey, result, this.CACHE_TTL);
      logger.info(`Report cached with key: ${cacheKey}`);
    } catch (error) {
      logger.warn('Error caching report:', error);
    }
  }

  /**
   * Store execution metadata
   */
  private async storeExecutionMetadata(
    executionId: string,
    metadata: ReportExecutionMetadata
  ): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const key = `${this.METADATA_PREFIX}${executionId}`;
      await this.redis.setJSON(key, metadata, this.CACHE_TTL * 24); // 24 hours
    } catch (error) {
      logger.warn('Error storing execution metadata:', error);
    }
  }

  /**
   * Get execution metadata
   */
  async getExecutionMetadata(executionId: string): Promise<ReportExecutionMetadata | null> {
    if (!this.redis) {
      return null;
    }

    try {
      const key = `${this.METADATA_PREFIX}${executionId}`;
      return await this.redis.getJSON<ReportExecutionMetadata>(key);
    } catch (error) {
      logger.warn('Error retrieving execution metadata:', error);
      return null;
    }
  }

  /**
   * Clear cache for a report
   */
  async clearCache(config: ReportBuilderConfig): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const cacheKey = this.generateCacheKey(config);
      await this.redis.del(cacheKey);
      logger.info(`Cache cleared for report: ${cacheKey}`);
    } catch (error) {
      logger.warn('Error clearing report cache:', error);
    }
  }

  /**
   * Clear all report caches
   */
  async clearAllCaches(): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      // Redis SCAN to find all cache keys
      logger.info('Clearing all report caches...');
      // Implementation would depend on Redis client API
    } catch (error) {
      logger.warn('Error clearing all caches:', error);
    }
  }

  /**
   * Generate cache key from report config
   */
  private generateCacheKey(config: ReportBuilderConfig): string {
    const configHash = this.hashConfig(config);
    return `${this.EXECUTION_CACHE_PREFIX}${configHash}`;
  }

  /**
   * Hash report config to create deterministic cache key
   */
  private hashConfig(config: ReportBuilderConfig): string {
    const key = JSON.stringify({
      name: config.name,
      type: config.type,
      format: config.format,
      filters: config.filters,
      groupBy: config.groupBy,
      metrics: config.metrics,
    });

    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Estimate report execution time
   */
  async estimateExecutionTime(config: ReportBuilderConfig): Promise<number> {
    // Base time in milliseconds
    const baseTime = 100;
    const filterComplexity = config.filters?.length || 0;
    const groupByComplexity = config.groupBy?.length || 0;
    const metricComplexity = config.metrics?.length || 0;

    // Estimate: base + (complexity factors)
    const estimatedTime =
      baseTime +
      filterComplexity * 50 +
      groupByComplexity * 75 +
      metricComplexity * 100;

    return Math.min(estimatedTime, 5000); // Cap at 5 seconds
  }
}
