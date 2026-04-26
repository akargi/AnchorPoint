/**
 * Types and interfaces for the Advanced Reporting API
 */

export enum ReportType {
  TRANSACTION_SUMMARY = 'transaction_summary',
  USER_ACTIVITY = 'user_activity',
  FINANCIAL_SUMMARY = 'financial_summary',
  COMPLIANCE = 'compliance',
  PERFORMANCE_METRICS = 'performance_metrics',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
  XLSX = 'xlsx',
  HTML = 'html',
}

export enum ReportScheduleFrequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
}

export enum ReportStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

export enum DistributionChannel {
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  S3 = 's3',
  SFTP = 'sftp',
  API = 'api',
  DASHBOARD = 'dashboard',
}

/**
 * Report builder configuration
 */
export interface ReportBuilderConfig {
  name: string;
  description?: string;
  type: ReportType;
  format: ReportFormat;
  filters?: ReportFilter[];
  groupBy?: string[];
  metrics?: string[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  customFields?: Record<string, any>;
  visualization?: VisualizationConfig;
}

/**
 * Report filter definition
 */
export interface ReportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in';
  value: any;
  caseSensitive?: boolean;
}

/**
 * Visualization configuration for charts and graphs
 */
export interface VisualizationConfig {
  type: 'line' | 'bar' | 'pie' | 'table' | 'heatmap' | 'scatter';
  title?: string;
  xAxis?: {
    field: string;
    label?: string;
  };
  yAxis?: {
    field: string;
    label?: string;
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  };
  colors?: string[];
  width?: number;
  height?: number;
  responsive?: boolean;
}

/**
 * Scheduled report configuration
 */
export interface ScheduledReportConfig {
  reportId: string;
  frequency: ReportScheduleFrequency;
  time?: string; // HH:mm format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  timezone?: string;
  enabled: boolean;
  maxRetries?: number;
  retryDelay?: number; // milliseconds
}

/**
 * Distribution configuration
 */
export interface DistributionConfig {
  reportId: string;
  channel: DistributionChannel;
  enabled: boolean;
  config: EmailDistributionConfig | WebhookDistributionConfig | S3DistributionConfig | SftpDistributionConfig;
}

export interface EmailDistributionConfig {
  recipients: string[];
  subject?: string;
  body?: string;
  attachmentFormat?: ReportFormat;
  cc?: string[];
  bcc?: string[];
}

export interface WebhookDistributionConfig {
  url: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  retryCount?: number;
  timeout?: number;
}

export interface S3DistributionConfig {
  bucket: string;
  region: string;
  prefix?: string;
  publicRead?: boolean;
  encryptionKey?: string;
}

export interface SftpDistributionConfig {
  host: string;
  port?: number;
  username: string;
  password: string;
  path: string;
  privateKey?: string;
}

/**
 * Report execution result
 */
export interface ReportExecutionResult {
  reportId: string;
  executionId: string;
  status: ReportStatus;
  startTime: Date;
  endTime?: Date;
  rowsProcessed?: number;
  dataSize?: number; // bytes
  format: ReportFormat;
  filePath?: string;
  downloadUrl?: string;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Report data structure
 */
export interface ReportData {
  headers: string[];
  rows: any[][];
  summary?: {
    totalRows: number;
    totalAmount?: number;
    metrics?: Record<string, any>;
  };
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    reportType: ReportType;
    format: ReportFormat;
  };
}

/**
 * Report pagination
 */
export interface ReportPaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Report query options
 */
export interface ReportQueryOptions {
  filters?: ReportFilter[];
  pagination?: ReportPaginationOptions;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  groupBy?: string[];
  includeMetadata?: boolean;
}

/**
 * Aggregation options
 */
export interface AggregationOptions {
  field: string;
  function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';
  alias?: string;
}

/**
 * Chart data for visualization
 */
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

/**
 * Report execution metadata
 */
export interface ReportExecutionMetadata {
  executionId: string;
  reportId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  rowsProcessed: number;
  dataSize: number; // bytes
  cacheHit: boolean;
  error?: string;
}
