# Advanced Reporting API

## Overview

The Advanced Reporting API provides a comprehensive solution for generating, scheduling, and distributing custom reports. It includes support for multiple report types, formats, scheduling strategies, and distribution channels.

## Features

### ✅ Custom Report Builder
- Multiple pre-built report types (transactions, user activity, financial, compliance, performance)
- Custom report support with flexible field configuration
- Advanced filtering and aggregation
- Grouping and sorting capabilities

### ✅ Flexible Export Formats
- **CSV** - Comma-separated values for spreadsheets
- **JSON** - Structured data format for APIs
- **HTML** - Human-readable web format
- **XLSX** - Microsoft Excel format
- **PDF** - Portable document format

### ✅ Scheduling System
- Multiple scheduling frequencies (once, daily, weekly, monthly, quarterly, annually)
- Timezone support
- Customizable execution times
- Automatic retry logic

### ✅ Distribution Channels
- **Email** - Direct email delivery with attachments
- **Webhook** - HTTP POST to custom endpoints
- **S3** - Amazon S3 cloud storage
- **SFTP** - Secure file transfer protocol
- **API** - REST API download
- **Dashboard** - Web dashboard viewing

### ✅ Performance Optimization
- Redis-backed caching (1-hour default TTL)
- Query optimization and pagination
- Execution time estimation
- Data size estimation

### ✅ Monitoring & Analytics
- Execution metadata tracking
- Performance metrics
- Error logging and reporting
- Execution history

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Reporting API Routes                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        ReportBuilderService                          │   │
│  │  • Build reports from configurations                 │   │
│  │  • Support multiple report types                     │   │
│  │  • Filter, aggregate, and transform data            │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        ReportExecutionService                        │   │
│  │  • Execute reports with caching                      │   │
│  │  • Track execution metadata                          │   │
│  │  • Performance optimization                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                    ↙                    ↘                     │
│  ┌──────────────────────┐    ┌─────────────────────────┐    │
│  │ ReportExportService  │    │ ReportSchedulingService │    │
│  │ • CSV, JSON, HTML    │    │ • Schedule management   │    │
│  │ • PDF, XLSX          │    │ • Distribution channels │    │
│  │ • Format conversion  │    │ • Cron-like scheduling  │    │
│  └──────────────────────┘    └─────────────────────────┘    │
│            ↓                            ↓                     │
│        Storage                      Redis + DB                │
└─────────────────────────────────────────────────────────────┘
```

### Report Types

#### Transaction Summary
Reports on transactions with status, amounts, and completion rates.

```typescript
{
  type: ReportType.TRANSACTION_SUMMARY,
  format: ReportFormat.CSV,
  filters: [
    { field: 'status', operator: 'equals', value: 'COMPLETED' },
    { field: 'amount', operator: 'gte', value: 1000 }
  ],
  dateRange: {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31')
  }
}
```

#### User Activity
Reports on user engagement, transaction counts, and volumes.

#### Financial Summary
Grouped by asset code with total volumes and transaction counts.

#### Compliance
KYC status distribution and compliance metrics.

#### Performance Metrics
System performance, uptime, and success rates.

#### Custom Reports
Build reports with custom fields and metrics.

## API Endpoints

All endpoints require authentication (JWT token in header).

### Generate Report

```
POST /api/reports/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Q1 2024 Transaction Summary",
  "type": "transaction_summary",
  "format": "json",
  "filters": [
    {
      "field": "createdAt",
      "operator": "between",
      "value": ["2024-01-01", "2024-03-31"]
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "reportId": "550e8400-e29b-41d4-a716-446655440000",
    "executionId": "550e8400-e29b-41d4-a716-446655440001",
    "status": "completed",
    "startTime": "2024-04-26T10:00:00Z",
    "endTime": "2024-04-26T10:05:32Z",
    "rowsProcessed": 1523,
    "dataSize": 245632,
    "format": "json"
  }
}
```

### Build and Export Report

```
POST /api/reports/build
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Monthly Report",
  "type": "financial_summary",
  "format": "xlsx"
}
```

Returns the file directly with appropriate Content-Type and Content-Disposition headers.

### Schedule Report

```
POST /api/reports/schedule
Content-Type: application/json
Authorization: Bearer <token>

{
  "reportId": "550e8400-e29b-41d4-a716-446655440000",
  "frequency": "weekly",
  "time": "09:00",
  "dayOfWeek": 1,
  "timezone": "America/New_York",
  "enabled": true
}
```

### List Schedules

```
GET /api/reports/schedules
Authorization: Bearer <token>
```

### Get Schedule

```
GET /api/reports/schedule/:reportId
Authorization: Bearer <token>
```

### Update Schedule

```
PATCH /api/reports/schedule/:reportId
Content-Type: application/json
Authorization: Bearer <token>

{
  "frequency": "daily",
  "time": "14:30"
}
```

### Delete Schedule

```
DELETE /api/reports/schedule/:reportId
Authorization: Bearer <token>
```

### Configure Distribution

```
POST /api/reports/distribution
Content-Type: application/json
Authorization: Bearer <token>

{
  "reportId": "550e8400-e29b-41d4-a716-446655440000",
  "channel": "email",
  "enabled": true,
  "config": {
    "recipients": ["admin@example.com", "finance@example.com"],
    "subject": "Monthly Financial Report",
    "attachmentFormat": "pdf"
  }
}
```

### List Distributions

```
GET /api/reports/distributions
Authorization: Bearer <token>
```

### Get Distribution

```
GET /api/reports/distribution/:reportId
Authorization: Bearer <token>
```

### Update Distribution

```
PATCH /api/reports/distribution/:reportId
Content-Type: application/json
Authorization: Bearer <token>

{
  "enabled": false,
  "config": {
    "recipients": ["newadmin@example.com"]
  }
}
```

### Delete Distribution

```
DELETE /api/reports/distribution/:reportId
Authorization: Bearer <token>
```

### Get Execution Details

```
GET /api/reports/:reportId/execution/:executionId
Authorization: Bearer <token>
```

### Estimate Report

```
POST /api/reports/estimate
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Large Report",
  "type": "transaction_summary",
  "format": "csv",
  "filters": [...]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "estimatedExecutionTime": 2500,
    "estimatedSize": 524288
  }
}
```

## Usage Examples

### Example 1: Generate Weekly Sales Report

```bash
# Create schedule
curl -X POST http://localhost:3002/api/reports/schedule \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reportId": "weekly-sales-001",
    "frequency": "weekly",
    "time": "09:00",
    "dayOfWeek": 1,
    "timezone": "UTC"
  }'

# Configure email distribution
curl -X POST http://localhost:3002/api/reports/distribution \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reportId": "weekly-sales-001",
    "channel": "email",
    "enabled": true,
    "config": {
      "recipients": ["sales@company.com"],
      "subject": "Weekly Sales Report",
      "attachmentFormat": "xlsx"
    }
  }'
```

### Example 2: Generate and Download Custom Report

```typescript
import axios from 'axios';

const token = 'your-jwt-token';

// Generate report in CSV format
const response = await axios.post(
  'http://localhost:3002/api/reports/build',
  {
    name: 'Custom Transaction Report',
    type: 'custom',
    format: 'csv',
    filters: [
      {
        field: 'status',
        operator: 'equals',
        value: 'COMPLETED'
      }
    ],
    metrics: ['User', 'Amount', 'AssetCode', 'Status']
  },
  {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    responseType: 'blob'
  }
);

// Save file
const blob = new Blob([response.data], { type: 'text/csv' });
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'report.csv';
link.click();
```

### Example 3: Webhook Distribution for Real-time Processing

```bash
# Configure webhook distribution
curl -X POST http://localhost:3002/api/reports/distribution \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reportId": "realtime-metrics-001",
    "channel": "webhook",
    "enabled": true,
    "config": {
      "url": "https://analytics.company.com/webhook/reports",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer webhook-token",
        "Content-Type": "application/json"
      },
      "retryCount": 3,
      "timeout": 30000
    }
  }'

# Schedule daily at 2 AM
curl -X POST http://localhost:3002/api/reports/schedule \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reportId": "realtime-metrics-001",
    "frequency": "daily",
    "time": "02:00",
    "enabled": true
  }'
```

## Performance Optimization

### Caching Strategy

- **Cache Duration**: 1 hour default (configurable)
- **Cache Key**: Hash of report configuration
- **Cache Hit**: Identical report configurations share cache
- **Cache Invalidation**: Automatic on schedule/distribution updates

### Query Optimization

- **Pagination**: Default limit of 1000 rows
- **Index Usage**: Leverage database indexes on common filter fields
- **Aggregation**: Pre-compute metrics where possible
- **Lazy Loading**: Load data only when needed

### Size Optimization

- **CSV Compression**: ~20% smaller than JSON
- **XLSX Compression**: ~40% smaller with Excel compression
- **PDF Compression**: ~50% smaller with PDF compression
- **Pagination**: Limit rows per export to manage memory

## Monitoring & Debugging

### Execution Metadata

Access execution details for performance analysis:

```json
{
  "executionId": "550e8400-e29b-41d4-a716-446655440001",
  "reportId": "weekly-sales-001",
  "userId": "user-123",
  "startTime": "2024-04-26T10:00:00Z",
  "endTime": "2024-04-26T10:05:32Z",
  "duration": 5320,
  "rowsProcessed": 1523,
  "dataSize": 245632,
  "cacheHit": false
}
```

### Performance Metrics

- Monitor report generation times
- Track cache hit rates
- Analyze data sizes by report type
- Measure distribution success rates

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Schedule not found | Invalid reportId | Verify reportId exists |
| Distribution not found | Channel not configured | Create distribution first |
| Export format unsupported | Invalid format | Use CSV, JSON, HTML, XLSX, or PDF |
| Insufficient permissions | User not authorized | Check JWT token and permissions |

### Retry Logic

- Email delivery: 3 retries with exponential backoff
- Webhook: Configurable retries (default 3)
- Failed executions: Logged for manual review

## Scaling Considerations

### Horizontal Scaling

- Reports cached in Redis for shared access
- Execution metadata stored in database
- Stateless API design enables load balancing

### Vertical Scaling

- Increase pagination limits for large datasets
- Optimize filter queries for performance
- Use database connection pooling

### Data Retention

- Execution metadata: 24 hours (configurable)
- Report cache: 1 hour (configurable)
- Distribution logs: 30 days (in database)

## Security

- Authentication required for all endpoints
- Rate limiting on report generation
- Input validation on all filters and configurations
- Webhook URLs validated before use
- S3 and SFTP credentials encrypted

## Future Enhancements

1. **Real-time Reports** - Streaming data as it arrives
2. **Report Templates** - Pre-configured report formats
3. **Data Visualization** - Interactive charts and graphs
4. **A/B Testing** - Compare report variations
5. **Multi-language** - Localized report content
6. **Custom Metrics** - User-defined calculations
7. **Report Sharing** - Public report links with time limits
8. **Analytics Dashboard** - Report usage analytics

## Troubleshooting

### Report not generating
1. Check authentication token is valid
2. Verify report type is supported
3. Check filters for valid field names
4. Review logs for specific errors

### Distribution not working
1. Verify distribution channel is enabled
2. Check webhook URL is accessible
3. Validate email recipients are correct
4. Review distribution configuration

### Slow report generation
1. Check cache hit rate
2. Review number of filters applied
3. Verify pagination is configured
4. Consider breaking into smaller date ranges

## Support

For issues or questions:
1. Check execution metadata for error details
2. Review application logs for stack traces
3. Test report generation manually via API
4. Contact system administrators
