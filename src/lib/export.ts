import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { ApplicationRow, ApplicationScreenshotRow } from "../types";
import { offerTypeLabels, statusLabels } from "../types";

export interface ExportOptions {
  applications: ApplicationRow[];
  format: "xlsx" | "csv";
  filename?: string;
}

export async function exportApplications(options: ExportOptions): Promise<void> {
  const { applications, format, filename } = options;
  const dateStr = new Date().toISOString().split("T")[0];
  const defaultFilename = `ResumeTracker_${dateStr}.${format === "xlsx" ? "xlsx" : "csv"}`;
  const finalFilename = filename || defaultFilename;

  if (format === "xlsx") {
    await exportToExcel(applications, finalFilename);
  } else {
    await exportToCSV(applications, finalFilename);
  }
}

async function exportToExcel(applications: ApplicationRow[], filename: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Applications", {
    properties: { tabColor: { argb: "4F46E5" } },
  });

  // Define columns
  worksheet.columns = [
    { header: "Company", key: "company", width: 25 },
    { header: "Role", key: "jobTitle", width: 30 },
    { header: "Package Offered", key: "packageOffered", width: 20 },
    { header: "Status", key: "status", width: 15 },
    { header: "Offer Type", key: "offerType", width: 18 },
    { header: "Applied Date", key: "appliedOn", width: 15 },
    { header: "Deadline", key: "deadline", width: 15 },
    { header: "Google Form Link", key: "googleFormLink", width: 35 },
    { header: "Resume File", key: "resumePath", width: 25 },
    { header: "Screenshots", key: "screenshots", width: 40 },
    { header: "Notes", key: "notes", width: 35 },
    { header: "Job Description", key: "jobDescription", width: 50 },
    { header: "Created Date", key: "createdAt", width: 20 },
    { header: "Updated Date", key: "updatedAt", width: 20 },
  ];

  // Style header row
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4F46E5" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Add data rows
  applications.forEach((app, rowIndex) => {
    const row = worksheet.addRow({
      company: app.company,
      jobTitle: app.job_title ?? "",
      packageOffered: app.package_offered ?? "",
      status: statusLabels[app.status] || app.status,
      offerType: offerTypeLabels[app.offer_type] || app.offer_type,
      appliedOn: app.applied_on ? formatDateForExcel(app.applied_on) : "",
      deadline: app.deadline ? formatDateForExcel(app.deadline) : "",
      googleFormLink: app.google_form_link ?? "",
      resumePath: app.resume_path ? getFileNameFromPath(app.resume_path) : "",
      screenshots: formatScreenshotsForExport(app.screenshots ?? []),
      notes: app.notes ?? "",
      jobDescription: app.job_description ?? "",
      createdAt: app.created_at ? formatDateTimeForExcel(app.created_at) : "",
      updatedAt: app.updated_at ? formatDateTimeForExcel(app.updated_at) : "",
    });

    // Style data rows
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "E5E7EB" } },
        left: { style: "thin", color: { argb: "E5E7EB" } },
        bottom: { style: "thin", color: { argb: "E5E7EB" } },
        right: { style: "thin", color: { argb: "E5E7EB" } },
      };

      // Alternate row colors
      if (rowIndex % 2 === 0) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F9FAFB" },
        };
      }

      // Make URLs clickable
      if ((colNumber === 8 || colNumber === 14 || colNumber === 15) && cell.value) {
        cell.font = { color: { argb: "2563EB" }, underline: true };
        cell.alignment = { ...cell.alignment, vertical: "middle", wrapText: true };
      }
    });

    // Set row height for better readability
    row.height = 30;
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columns.length },
  };

  // Freeze header row
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  // Set column widths (auto-size with max)
  worksheet.columns.forEach((column) => {
    if (column.width && column.width > 50) {
      column.width = 50;
    }
  });

  // Generate buffer and save
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}

async function exportToCSV(applications: ApplicationRow[], filename: string): Promise<void> {
  const headers = [
    "Company",
    "Role",
    "Package Offered",
    "Status",
    "Offer Type",
    "Applied Date",
    "Deadline",
    "Google Form Link",
    "Resume File",
    "Screenshots",
    "Notes",
    "Job Description",
    "Created Date",
    "Updated Date",
  ];

  const rows = applications.map((app) => [
    escapeCSV(app.company),
    escapeCSV(app.job_title ?? ""),
    escapeCSV(app.package_offered ?? ""),
    escapeCSV(statusLabels[app.status] || app.status),
    escapeCSV(offerTypeLabels[app.offer_type] || app.offer_type),
    escapeCSV(app.applied_on ?? ""),
    escapeCSV(app.deadline ?? ""),
    escapeCSV(app.google_form_link ?? ""),
    escapeCSV(app.resume_path ? getFileNameFromPath(app.resume_path) : ""),
    escapeCSV(formatScreenshotsForExport(app.screenshots ?? [])),
    escapeCSV(app.notes ?? ""),
    escapeCSV(app.job_description ?? ""),
    escapeCSV(app.created_at ? formatDateTimeForCSV(app.created_at) : ""),
    escapeCSV(app.updated_at ? formatDateTimeForCSV(app.updated_at) : ""),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, filename);
}

function formatScreenshotsForExport(screenshots: ApplicationScreenshotRow[]): string {
  if (!screenshots.length) return "";
  return screenshots.map((s) => s.file_name).join("; ");
}

function getFileNameFromPath(path: string): string {
  return path.split("/").pop() ?? path;
}

function formatDateForExcel(dateStr: string): string {
  // Excel expects dates in a format it can parse
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toISOString().split("T")[0];
}

function formatDateTimeForExcel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().replace("T", " ").split(".")[0];
}

function formatDateTimeForCSV(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().replace("T", " ").split(".")[0];
}

function escapeCSV(value: string): string {
  if (!value) return "";
  // Escape double quotes and wrap in quotes if contains comma, quote, or newline
  const escaped = value.replace(/"/g, '""');
  if (escaped.includes(",") || escaped.includes('"') || escaped.includes("\n")) {
    return `"${escaped}"`;
  }
  return escaped;
}

export function getExportColumns(): string[] {
  return [
    "Company",
    "Role",
    "Package Offered",
    "Status",
    "Offer Type",
    "Applied Date",
    "Deadline",
    "Google Form Link",
    "Resume File",
    "Screenshots",
    "Notes",
    "Job Description",
    "Created Date",
    "Updated Date",
  ];
}