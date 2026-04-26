import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { ReportBuilderService } from '../../services/report-builder.service';
import { ReportExecutionService } from '../../services/report-execution.service';
import { ReportSchedulingService } from '../../services/report-scheduling.service';
import { ReportExportService } from '../../services/report-export.service';
import {
  ReportType,
  ReportFormat,
  ReportScheduleFrequency,
  DistributionChannel,
} from '../../types/reporting.types';
import logger from '../../utils/logger';

export function createReportingRouter(
  reportBuilder: ReportBuilderService,
  reportExecution: ReportExecutionService,
  reportScheduling: ReportSchedulingService,
  reportExport: ReportExportService
): Router {
  const router = Router();

  // Validation schemas
  const reportFilterSchema = z.object({
    field: z.string(),
    operator: z.enum(['equals', 'contains', 'startsWith', 'endsWith', 'gt', 'gte', 'lt', 'lte', 'between', 'in']),
    value: z.any(),
    caseSensitive: z.boolean().optional(),
  });

  const reportBuilderConfigSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(Object.values(ReportType) as any),
    format: z.enum(Object.values(ReportFormat) as any),
    filters: z.array(reportFilterSchema).optional(),
    groupBy: z.array(z.string()).optional(),
    metrics: z.array(z.string()).optional(),
    customFields: z.record(z.any()).optional(),
  });

  const scheduleConfigSchema = z.object({
    reportId: z.string(),
    frequency: z.enum(Object.values(ReportScheduleFrequency) as any),
    time: z.string().optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    timezone: z.string().optional(),
    enabled: z.boolean().default(true),
  });

  const distributionConfigSchema = z.object({
    reportId: z.string(),
    channel: z.enum(Object.values(DistributionChannel) as any),
    enabled: z.boolean().default(true),
    config: z.record(z.any()),
  });

  // POST /reports/generate - Generate a report
  router.post(
    '/generate',
    authMiddleware,
    validate({ body: reportBuilderConfigSchema }),
    async (req: Request, res: Response) => {
      try {
        const config = req.body;

        const executionResult = await reportExecution.executeReport(config);

        res.json({
          success: true,
          data: executionResult,
        });
      } catch (error) {
        logger.error('Error generating report:', error);
        res.status(500).json({
          error: 'Failed to generate report',
          statusCode: 500,
        });
      }
    }
  );

  // POST /reports/build - Build and export a report
  router.post(
    '/build',
    authMiddleware,
    validate({ body: reportBuilderConfigSchema }),
    async (req: Request, res: Response) => {
      try {
        const config = req.body;

        // Build the report
        const reportData = await reportBuilder.buildReport(config);

        // Export to requested format
        const exportedData = await reportExport.exportReport(reportData, config.format);

        const mimeType = reportExport.getMimeType(config.format);
        const extension = reportExport.getFileExtension(config.format);
        const filename = `${config.name.replace(/\s+/g, '_')}_${Date.now()}.${extension}`;

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        if (typeof exportedData === 'string') {
          res.send(exportedData);
        } else {
          res.send(exportedData);
        }
      } catch (error) {
        logger.error('Error building report:', error);
        res.status(500).json({
          error: 'Failed to build report',
          statusCode: 500,
        });
      }
    }
  );

  // GET /reports/:reportId/execution/:executionId - Get execution details
  router.get(
    '/:reportId/execution/:executionId',
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const { executionId } = req.params;

        const metadata = await reportExecution.getExecutionMetadata(executionId);

        if (!metadata) {
          return res.status(404).json({
            error: 'Execution not found',
            statusCode: 404,
          });
        }

        res.json({
          success: true,
          data: metadata,
        });
      } catch (error) {
        logger.error('Error retrieving execution:', error);
        res.status(500).json({
          error: 'Failed to retrieve execution',
          statusCode: 500,
        });
      }
    }
  );

  // POST /reports/schedule - Create a scheduled report
  router.post(
    '/schedule',
    authMiddleware,
    validate({ body: scheduleConfigSchema }),
    async (req: Request, res: Response) => {
      try {
        const config = req.body;

        await reportScheduling.createSchedule(config);

        res.status(201).json({
          success: true,
          message: 'Report scheduled successfully',
          data: config,
        });
      } catch (error) {
        logger.error('Error creating schedule:', error);
        res.status(500).json({
          error: 'Failed to create schedule',
          statusCode: 500,
        });
      }
    }
  );

  // GET /reports/schedules - List all schedules
  router.get(
    '/schedules',
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const schedules = await reportScheduling.listSchedules();

        res.json({
          success: true,
          data: schedules,
          count: schedules.length,
        });
      } catch (error) {
        logger.error('Error listing schedules:', error);
        res.status(500).json({
          error: 'Failed to list schedules',
          statusCode: 500,
        });
      }
    }
  );

  // GET /reports/schedule/:reportId - Get schedule
  router.get(
    '/schedule/:reportId',
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const { reportId } = req.params;

        const schedule = await reportScheduling.getSchedule(reportId);

        if (!schedule) {
          return res.status(404).json({
            error: 'Schedule not found',
            statusCode: 404,
          });
        }

        res.json({
          success: true,
          data: schedule,
        });
      } catch (error) {
        logger.error('Error retrieving schedule:', error);
        res.status(500).json({
          error: 'Failed to retrieve schedule',
          statusCode: 500,
        });
      }
    }
  );

  // PATCH /reports/schedule/:reportId - Update schedule
  router.patch(
    '/schedule/:reportId',
    authMiddleware,
    validate({ body: scheduleConfigSchema.partial() }),
    async (req: Request, res: Response) => {
      try {
        const { reportId } = req.params;
        const updates = req.body;

        await reportScheduling.updateSchedule(reportId, updates);

        res.json({
          success: true,
          message: 'Schedule updated successfully',
        });
      } catch (error) {
        logger.error('Error updating schedule:', error);
        res.status(500).json({
          error: 'Failed to update schedule',
          statusCode: 500,
        });
      }
    }
  );

  // DELETE /reports/schedule/:reportId - Delete schedule
  router.delete(
    '/schedule/:reportId',
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const { reportId } = req.params;

        await reportScheduling.deleteSchedule(reportId);

        res.json({
          success: true,
          message: 'Schedule deleted successfully',
        });
      } catch (error) {
        logger.error('Error deleting schedule:', error);
        res.status(500).json({
          error: 'Failed to delete schedule',
          statusCode: 500,
        });
      }
    }
  );

  // POST /reports/distribution - Create distribution
  router.post(
    '/distribution',
    authMiddleware,
    validate({ body: distributionConfigSchema }),
    async (req: Request, res: Response) => {
      try {
        const config = req.body;

        await reportScheduling.createDistribution(config);

        res.status(201).json({
          success: true,
          message: 'Distribution configured successfully',
          data: config,
        });
      } catch (error) {
        logger.error('Error creating distribution:', error);
        res.status(500).json({
          error: 'Failed to create distribution',
          statusCode: 500,
        });
      }
    }
  );

  // GET /reports/distributions - List all distributions
  router.get(
    '/distributions',
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const distributions = await reportScheduling.listDistributions();

        res.json({
          success: true,
          data: distributions,
          count: distributions.length,
        });
      } catch (error) {
        logger.error('Error listing distributions:', error);
        res.status(500).json({
          error: 'Failed to list distributions',
          statusCode: 500,
        });
      }
    }
  );

  // GET /reports/distribution/:reportId - Get distribution
  router.get(
    '/distribution/:reportId',
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const { reportId } = req.params;

        const distribution = await reportScheduling.getDistribution(reportId);

        if (!distribution) {
          return res.status(404).json({
            error: 'Distribution not found',
            statusCode: 404,
          });
        }

        res.json({
          success: true,
          data: distribution,
        });
      } catch (error) {
        logger.error('Error retrieving distribution:', error);
        res.status(500).json({
          error: 'Failed to retrieve distribution',
          statusCode: 500,
        });
      }
    }
  );

  // PATCH /reports/distribution/:reportId - Update distribution
  router.patch(
    '/distribution/:reportId',
    authMiddleware,
    validate({ body: distributionConfigSchema.partial() }),
    async (req: Request, res: Response) => {
      try {
        const { reportId } = req.params;
        const updates = req.body;

        await reportScheduling.updateDistribution(reportId, updates);

        res.json({
          success: true,
          message: 'Distribution updated successfully',
        });
      } catch (error) {
        logger.error('Error updating distribution:', error);
        res.status(500).json({
          error: 'Failed to update distribution',
          statusCode: 500,
        });
      }
    }
  );

  // DELETE /reports/distribution/:reportId - Delete distribution
  router.delete(
    '/distribution/:reportId',
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const { reportId } = req.params;

        await reportScheduling.deleteDistribution(reportId);

        res.json({
          success: true,
          message: 'Distribution deleted successfully',
        });
      } catch (error) {
        logger.error('Error deleting distribution:', error);
        res.status(500).json({
          error: 'Failed to delete distribution',
          statusCode: 500,
        });
      }
    }
  );

  // GET /reports/estimate - Estimate report execution time
  router.post(
    '/estimate',
    authMiddleware,
    validate({ body: reportBuilderConfigSchema }),
    async (req: Request, res: Response) => {
      try {
        const config = req.body;

        const estimatedTime = await reportExecution.estimateExecutionTime(config);
        const estimatedSize = reportExport.estimateExportSize(
          {
            headers: [],
            rows: [],
            metadata: {
              generatedAt: new Date(),
              generatedBy: 'system',
              reportType: config.type,
              format: config.format,
            },
          },
          config.format
        );

        res.json({
          success: true,
          data: {
            estimatedExecutionTime: estimatedTime,
            estimatedSize: estimatedSize,
          },
        });
      } catch (error) {
        logger.error('Error estimating report:', error);
        res.status(500).json({
          error: 'Failed to estimate report',
          statusCode: 500,
        });
      }
    }
  );

  return router;
}
