import {
  CalendarDays,
  ExternalLink,
  FileImage,
  FileText,
  Package,
  Pencil,
  Send,
  Trash2,
  Image,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
} from "lucide-react";
import { useState } from "react";
import type { ApplicationRow, ApplicationStatus, ApplicationScreenshotRow } from "../types";
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
  const screenshots = application?.screenshots ?? [];
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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

  function openLightbox(index: number) {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
  }

  function nextScreenshot() {
    setLightboxIndex((i) => (i + 1) % screenshots.length);
  }

  function prevScreenshot() {
    setLightboxIndex((i) => (i - 1 + screenshots.length) % screenshots.length);
  }

  const currentLightboxScreenshot = screenshots[lightboxIndex];

  return (
    <>
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
            <Send size={16} />
            Apply Now
          </a>
        )}

        <div className="status-row">
          {statuses.map((status) => (
            <button
              className={`status-chip ${status} ${status === application.status ? "selected" : ""}`}
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

        {screenshots.length > 0 && (
          <section className="screenshots-section">
            <h3>Screenshots ({screenshots.length})</h3>
            <div className="screenshots-gallery">
              {screenshots.map((screenshot, index) => (
                <button
                  key={screenshot.id}
                  className="gallery-thumbnail"
                  onClick={() => openLightbox(index)}
                  aria-label={`View ${screenshot.file_name}`}
                >
                  <div className="thumbnail-image" style={{ backgroundImage: `url("${getPlaceholderForScreenshot(screenshot)}")` }} />
                  <span className="thumbnail-filename" title={screenshot.file_name}>
                    {screenshot.file_name}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="attachment-grid">
          {application.google_form_screenshot_path && (
            <button
              className="attachment-button legacy"
              disabled={!application.google_form_screenshot_path}
              onClick={() =>
                application.google_form_screenshot_path &&
                onOpenFile(application.google_form_screenshot_path)
              }
            >
              <FileImage size={18} />
              <span>Legacy Screenshot</span>
              <ExternalLink size={16} />
            </button>
          )}
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

      {lightboxOpen && currentLightboxScreenshot && (
        <div
          className="lightbox-overlay"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot preview"
        >
          <div className="lightbox" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={closeLightbox}
              aria-label="Close preview"
            >
              <X size={24} />
            </button>

            {screenshots.length > 1 && (
              <>
                <button
                  className="lightbox-nav prev"
                  onClick={prevScreenshot}
                  aria-label="Previous screenshot"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  className="lightbox-nav next"
                  onClick={nextScreenshot}
                  aria-label="Next screenshot"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}

            <div className="lightbox-content">
              <div className="lightbox-image-wrapper">
                <img
                  src={getPlaceholderForScreenshot(currentLightboxScreenshot)}
                  alt={currentLightboxScreenshot.file_name}
                  className="lightbox-image"
                />
                <div className="lightbox-info">
                  <span className="lightbox-filename">{currentLightboxScreenshot.file_name}</span>
                  <span className="lightbox-counter">
                    {lightboxIndex + 1} / {screenshots.length}
                  </span>
                </div>
              </div>

              <div className="lightbox-actions">
                <button className="lightbox-download" onClick={() => downloadScreenshot(currentLightboxScreenshot)}>
                  <Download size={18} />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getPlaceholderForScreenshot(screenshot: ApplicationScreenshotRow): string {
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="14" fill="#9ca3af">${screenshot.file_name}</text>
    </svg>
  `)}`;
}

async function downloadScreenshot(screenshot: ApplicationScreenshotRow) {
  try {
    // In production, this would fetch a signed URL and download
    // For now, we'll just open the file path
    window.open(screenshot.storage_path, "_blank", "noopener,noreferrer");
  } catch (err) {
    console.error("Download failed:", err);
  }
}