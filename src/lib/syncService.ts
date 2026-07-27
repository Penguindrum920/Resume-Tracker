import type { ApplicationRow, ApplicationScreenshotRow } from "../types";
import { offerTypeLabels, statusLabels } from "../types";

export interface SyncStatus {
  google: SyncProviderStatus;
  excel: SyncProviderStatus;
}

export interface SyncProviderStatus {
  connected: boolean;
  lastSyncTime: string | null;
  syncedRecords: number;
  status: "idle" | "syncing" | "success" | "error";
  error: string | null;
}

export interface SyncResult {
  error: string | null;
  syncedCount?: number;
}

export interface SyncProgress {
  current: number;
  total: number;
}

export interface SpreadsheetRow {
  applicationId: string;
  company: string;
  role: string;
  packageOffered: string;
  status: string;
  offerType: string;
  appliedDate: string;
  deadline: string;
  googleFormLink: string;
  resumeFile: string;
  screenshots: string;
  notes: string;
  jobDescription: string;
  createdDate: string;
  updatedDate: string;
}

export const SPREADSHEET_HEADERS = [
  "Application ID",
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

export function applicationsToSpreadsheetRows(applications: ApplicationRow[]): SpreadsheetRow[] {
  return applications.map((app) => ({
    applicationId: app.id,
    company: app.company,
    role: app.job_title ?? "",
    packageOffered: app.package_offered ?? "",
    status: statusLabels[app.status] || app.status,
    offerType: offerTypeLabels[app.offer_type] || app.offer_type,
    appliedDate: app.applied_on ?? "",
    deadline: app.deadline ?? "",
    googleFormLink: app.google_form_link ?? "",
    resumeFile: app.resume_path ? getFileNameFromPath(app.resume_path) : "",
    screenshots: formatScreenshotsForSync(app.screenshots ?? []),
    notes: app.notes ?? "",
    jobDescription: app.job_description ?? "",
    createdDate: app.created_at ?? "",
    updatedDate: app.updated_at ?? "",
  }));
}

export function spreadsheetRowToApplication(
  row: Record<string, string | number | null>,
): Partial<ApplicationRow> {
  const statusKey = reverseLookup(statusLabels, String(row["Status"] ?? ""));
  const offerTypeKey = reverseLookup(offerTypeLabels, String(row["Offer Type"] ?? ""));

  return {
    id: String(row["Application ID"] ?? ""),
    company: String(row["Company"] ?? ""),
    job_title: String(row["Role"] ?? "") || null,
    package_offered: String(row["Package Offered"] ?? "") || null,
    status: (statusKey || "applied") as ApplicationRow["status"],
    offer_type: (offerTypeKey || "other") as ApplicationRow["offer_type"],
    applied_on: String(row["Applied Date"] ?? ""),
    deadline: String(row["Deadline"] ?? "") || null,
    google_form_link: String(row["Google Form Link"] ?? "") || null,
    resume_path: String(row["Resume File"] ?? "") || null,
    notes: String(row["Notes"] ?? "") || null,
    job_description: String(row["Job Description"] ?? ""),
  };
}

function formatScreenshotsForSync(screenshots: ApplicationScreenshotRow[]): string {
  if (!screenshots.length) return "";
  return screenshots.map((s) => s.file_name).join("; ");
}

function getFileNameFromPath(path: string): string {
  return path.split("/").pop() ?? path;
}

function reverseLookup<K extends string>(map: Record<K, string>, value: string): K | "" {
  for (const [key, label] of Object.entries(map)) {
    if (label === value) return key as K;
  }
  return "";
}