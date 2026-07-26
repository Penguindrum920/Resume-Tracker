import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Edit3,
  ExternalLink,
  FileImage,
  FileText,
  Package,
  Trash2,
} from "lucide-react";
import type { ApplicationRow } from "../types";
import { offerTypeLabels, statusLabels } from "../types";

export function ApplicationCard({
  application,
  isSelected,
  onSelect,
  onDelete,
  onOpenFile,
}: {
  application: ApplicationRow;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onOpenFile: (path: string) => void;
}) {
  return (
    <div
      className={`application-card ${isSelected ? "active" : ""}`}
      onClick={onSelect}
    >
      <div className="card-header">
        <span className={`status-dot ${application.status}`} />
        <div className="card-info">
          <strong>{application.company}</strong>
          <small>{application.job_title || "Role not specified"}</small>
        </div>
        <div className="card-actions">
          {application.google_form_link && (
            <a
              className="card-link-btn"
              href={application.google_form_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Open Application Form"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      <div className="card-meta">
        <span className="card-tag tag-offer">{offerTypeLabels[application.offer_type]}</span>
        <span className="card-tag tag-status">{statusLabels[application.status]}</span>
        {application.package_offered && (
          <span className="card-tag tag-package">
            <Package size={11} />
            {application.package_offered}
          </span>
        )}
      </div>

      <div className="card-dates">
        {application.deadline && (
          <span className="card-date">
            <CalendarDays size={12} />
            Deadline: {formatDate(application.deadline)}
          </span>
        )}
        <span className="card-date">
          <CalendarDays size={12} />
          Applied: {formatDate(application.applied_on)}
        </span>
      </div>

      <div className="card-footer">
        {application.google_form_screenshot_path && (
          <button
            className="card-file-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenFile(application.google_form_screenshot_path!);
            }}
          >
            <FileImage size={13} />
            Screenshot
          </button>
        )}
        {application.resume_path && (
          <button
            className="card-file-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenFile(application.resume_path!);
            }}
          >
            <FileText size={13} />
            Resume
          </button>
        )}
        <button
          className="card-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
