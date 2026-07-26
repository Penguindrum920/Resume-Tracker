import {
  CalendarDays,
  ExternalLink,
  FileImage,
  FileText,
  Package,
  Pencil,
  Trash2,
} from "lucide-react";
import type { ApplicationRow, ApplicationStatus } from "../types";
import { offerTypeLabels, statuses, statusLabels } from "../types";
import { EmptyState } from "./EmptyState";

export function ApplicationDetail({
  application,
  busy,
  onDelete,
  onOpenFile,
  onStatusChange,
  onEdit,
}: {
  application: ApplicationRow | null;
  busy: boolean;
  onDelete: (application: ApplicationRow) => void;
  onOpenFile: (path: string) => void;
  onStatusChange: (application: ApplicationRow, status: ApplicationStatus) => void;
  onEdit: (application: ApplicationRow) => void;
}) {
  if (!application) {
    return (
      <div className="detail-panel empty-detail">
        <EmptyState
          title="Select an application"
          description="Click an application to view details"
        />
      </div>
    );
  }

  return (
    <article className="detail-panel">
      <div className="detail-head">
        <div>
          <p className="eyebrow">{offerTypeLabels[application.offer_type]}</p>
          <h2>{application.company}</h2>
          <span>{application.job_title || "Role not specified"}</span>
        </div>
        <div className="detail-actions">
          <button
            className="icon-button"
            onClick={() => onEdit(application)}
            disabled={busy}
            aria-label="Edit application"
          >
            <Pencil size={16} />
          </button>
          <button
            className="icon-button danger"
            onClick={() => onDelete(application)}
            disabled={busy}
            aria-label="Delete application"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {application.google_form_link && (
        <a
          className="form-link-button"
          href={application.google_form_link}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={16} />
          Open Application Form
        </a>
      )}

      <div className="status-row">
        {statuses.map((status) => (
          <button
            className={`status-chip ${status} ${
              status === application.status ? "selected" : ""
            }`}
            key={status}
            disabled={busy}
            onClick={() => onStatusChange(application, status)}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>

      <dl className="detail-meta">
        <div>
          <dt>Applied</dt>
          <dd>{formatDate(application.applied_on)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{statusLabels[application.status]}</dd>
        </div>
        {application.package_offered && (
          <div>
            <dt>Package</dt>
            <dd>{application.package_offered}</dd>
          </div>
        )}
        {application.deadline && (
          <div>
            <dt>Deadline</dt>
            <dd>{formatDate(application.deadline)}</dd>
          </div>
        )}
      </dl>

      <section className="description-block">
        <h3>Job description</h3>
        <p>{application.job_description || "No description provided."}</p>
      </section>

      {application.notes && (
        <section className="description-block">
          <h3>Notes</h3>
          <p>{application.notes}</p>
        </section>
      )}

      <div className="attachment-grid">
        <button
          className="attachment-button"
          disabled={!application.google_form_screenshot_path}
          onClick={() =>
            application.google_form_screenshot_path &&
            onOpenFile(application.google_form_screenshot_path)
          }
        >
          <FileImage size={18} />
          <span>Google form</span>
          <ExternalLink size={16} />
        </button>
        <button
          className="attachment-button"
          disabled={!application.resume_path}
          onClick={() => application.resume_path && onOpenFile(application.resume_path)}
        >
          <FileText size={18} />
          <span>Resume</span>
          <ExternalLink size={16} />
        </button>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
