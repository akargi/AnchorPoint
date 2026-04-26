import { ReportData, ReportFormat } from '../types/reporting.types';
import logger from '../utils/logger';

/**
 * Service for exporting report data in various formats
 */
export class ReportExportService {
  /**
   * Export report data in specified format
   */
  async exportReport(data: ReportData, format: ReportFormat): Promise<string | Buffer> {
    try {
      logger.info(`Exporting report in format: ${format}`);

      switch (format) {
        case ReportFormat.CSV:
          return this.exportAsCSV(data);
        case ReportFormat.JSON:
          return this.exportAsJSON(data);
        case ReportFormat.HTML:
          return this.exportAsHTML(data);
        case ReportFormat.XLSX:
          return await this.exportAsXLSX(data);
        case ReportFormat.PDF:
          return await this.exportAsPDF(data);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error(`Error exporting report in format ${format}:`, error);
      throw error;
    }
  }

  /**
   * Export as CSV
   */
  private exportAsCSV(data: ReportData): string {
    const headers = data.headers.map(h => this.escapeCSVField(h)).join(',');

    const rows = data.rows.map(row =>
      row.map(field => this.escapeCSVField(String(field))).join(',')
    );

    const summary = data.summary ? this.summarizeAsCSV(data.summary) : '';

    return [headers, ...rows, summary].filter(Boolean).join('\n');
  }

  /**
   * Export as JSON
   */
  private exportAsJSON(data: ReportData): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Export as HTML
   */
  private exportAsHTML(data: ReportData): string {
    const title = data.metadata.reportType;
    const generatedAt = data.metadata.generatedAt.toISOString();

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .summary { background-color: #f9f9f9; padding: 15px; border: 1px solid #ddd; margin: 20px 0; }
    .metadata { color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <table>
    <thead>
      <tr>
        ${data.headers.map(h => `<th>${h}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>
`;

    if (data.summary) {
      html += `
  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Total Rows:</strong> ${data.summary.totalRows}</p>
    ${data.summary.totalAmount ? `<p><strong>Total Amount:</strong> ${data.summary.totalAmount}</p>` : ''}
    ${data.summary.metrics ? `
    <p><strong>Metrics:</strong></p>
    <ul>
      ${Object.entries(data.summary.metrics)
        .map(([key, value]) => `<li>${key}: ${value}</li>`)
        .join('')}
    </ul>
    ` : ''}
  </div>
`;
    }

    html += `
  <div class="metadata">
    <p>Generated at: ${generatedAt}</p>
    <p>Report Type: ${data.metadata.reportType}</p>
  </div>
</body>
</html>
`;

    return html;
  }

  /**
   * Export as XLSX
   */
  private async exportAsXLSX(data: ReportData): Promise<Buffer> {
    try {
      // XLSX export requires a library like 'xlsx' or 'exceljs'
      // This is a mock implementation - actual implementation would create proper Excel file
      logger.info('Exporting as XLSX format (mock implementation)');

      // In production, use library like:
      // const ExcelJS = require('exceljs');
      // const workbook = new ExcelJS.Workbook();
      // const worksheet = workbook.addWorksheet('Report');
      // etc.

      const mockBuffer = Buffer.from(
        `XLSX Export\n${JSON.stringify(data)}`,
        'utf-8'
      );
      return mockBuffer;
    } catch (error) {
      logger.error('Error exporting as XLSX:', error);
      throw error;
    }
  }

  /**
   * Export as PDF
   */
  private async exportAsPDF(data: ReportData): Promise<Buffer> {
    try {
      // PDF export requires a library like 'pdfkit' or 'puppeteer'
      // This is a mock implementation
      logger.info('Exporting as PDF format (mock implementation)');

      // In production, use library like:
      // const PDFDocument = require('pdfkit');
      // const doc = new PDFDocument();
      // etc.

      const mockBuffer = Buffer.from(
        `PDF Export\n${JSON.stringify(data)}`,
        'utf-8'
      );
      return mockBuffer;
    } catch (error) {
      logger.error('Error exporting as PDF:', error);
      throw error;
    }
  }

  /**
   * Escape CSV field values
   */
  private escapeCSVField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Summarize data as CSV
   */
  private summarizeAsCSV(summary: any): string {
    if (!summary) return '';

    const lines = ['\n# Summary'];
    lines.push(`Total Rows,${summary.totalRows}`);

    if (summary.totalAmount) {
      lines.push(`Total Amount,${summary.totalAmount}`);
    }

    if (summary.metrics) {
      Object.entries(summary.metrics).forEach(([key, value]) => {
        lines.push(`${key},${value}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Get file extension for format
   */
  getFileExtension(format: ReportFormat): string {
    switch (format) {
      case ReportFormat.CSV:
        return 'csv';
      case ReportFormat.JSON:
        return 'json';
      case ReportFormat.HTML:
        return 'html';
      case ReportFormat.XLSX:
        return 'xlsx';
      case ReportFormat.PDF:
        return 'pdf';
      default:
        return 'txt';
    }
  }

  /**
   * Get MIME type for format
   */
  getMimeType(format: ReportFormat): string {
    switch (format) {
      case ReportFormat.CSV:
        return 'text/csv';
      case ReportFormat.JSON:
        return 'application/json';
      case ReportFormat.HTML:
        return 'text/html';
      case ReportFormat.XLSX:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case ReportFormat.PDF:
        return 'application/pdf';
      default:
        return 'text/plain';
    }
  }

  /**
   * Calculate export size estimate
   */
  estimateExportSize(data: ReportData, format: ReportFormat): number {
    const baseSize = JSON.stringify(data).length;

    switch (format) {
      case ReportFormat.CSV:
        return baseSize * 0.8; // CSV is typically smaller
      case ReportFormat.JSON:
        return baseSize; // JSON is similar size
      case ReportFormat.HTML:
        return baseSize * 1.5; // HTML has overhead
      case ReportFormat.XLSX:
        return baseSize * 0.6; // XLSX with compression
      case ReportFormat.PDF:
        return baseSize * 0.5; // PDF with compression
      default:
        return baseSize;
    }
  }
}
