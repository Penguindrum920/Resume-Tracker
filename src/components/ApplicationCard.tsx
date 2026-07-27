import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Edit3,
  ExternalLink,
  FileImage,
  FileText,
  Package,
  Send,
  Trash2,
  Image,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useState } from "react";
import type { ApplicationRow, ApplicationScreenshotRow } from "../types";
import { offerTypeLabels, statusLabels } from "../types";

export function ApplicationCard({
  application,
  isSelected,
  onSelect,
  onDelete,
  onOpenFile,
  onOpenScreenshot,
}: {
  application: ApplicationRow;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onOpenFile: (path: string) => void;
  onOpenScreenshot?: (screenshot: ApplicationScreenshotRow, index: number, screenshots: ApplicationScreenshotRow[]) => void;
}) {
  const screenshots = application.screenshots ?? [];
  const hasMultipleScreenshots = screenshots.length > 1;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const handleScreenshotClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenScreenshot && screenshots[index]) {
      onOpenScreenshot(screenshots[index], index, screenshots);
    }
    setPreviewIndex(index);
    setPreviewOpen(true);
  };

  if (previewOpen) {
    const currentScreenshot = screenshots[previewIndex];
    return (
      <>
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
            <div className="card-actions" />
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

          <div className="card-screenshots-preview">
            {screenshots.map((screenshot, index) => (
              <button
                key={screenshot.id}
                className="screenshot-thumbnail"
                onClick={(e) => handleScreenshotClick(index, e)}
                style={{
                  backgroundImage: `url("${getPlaceholderForScreenshot(screenshot)}")`,
                }}
                aria-label={`Screenshot ${index + 1}: ${screenshot.file_name}`}
              >
                {index === 0 && hasMultipleScreenshots && (
                  <span className="screenshot-overlay">
                    +{screenshots.length - 1} more
                  </span>
                )}
              </button>
            ))}
            {screenshots.length === 0 && (
              <div className="no-screenshots-placeholder">
                <Image size={20} />
                <span>No screenshots</span>
              </div>
            )}
          </div>

          <div className="card-footer">
            {application.google_form_link && (
              <a
                className="card-apply-btn"
                href={application.google_form_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Send size={13} />
                Apply
              </a>
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

        <div
          className="screenshot-lightbox-overlay"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="screenshot-lightbox"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="lightbox-close"
              onClick={() => setPreviewOpen(false)}
              aria-label="Close preview"
            >
              <X size={24} />
            </button>
            {screenshots.length > 1 && (
              <>
                <button
                  className="lightbox-nav prev"
                  onClick={() => setPreviewIndex((i) => (i - 1 + screenshots.length) % screenshots.length)}
                  aria-label="Previous screenshot"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  className="lightbox-nav next"
                  onClick={() => setPreviewIndex((i) => (i + 1) % screenshots.length)}
                  aria-label="Next screenshot"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
            <div className="lightbox-content">
              {currentScreenshot && (
                <div className="lightbox-image-wrapper">
                  <img
                    src={getPlaceholderForScreenshot(currentScreenshot)}
                    alt={currentScreenshot.file_name}
                    className="lightbox-image"
                  />
                  <div className="lightbox-info">
                    <span className="lightbox-filename">{currentScreenshot.file_name}</span>
                    <span className="lightbox-counter">
                      {previewIndex + 1} / {screenshots.length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

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
        <div className="card-actions" />
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

      <div className="card-screenshots-preview">
        {screenshots.map((screenshot, index) => (
          <button
            key={screenshot.id}
            className="screenshot-thumbnail"
            onClick={(e) => handleScreenshotClick(index, e)}
            style={{
              backgroundImage: `url("${getPlaceholderForScreenshot(screenshot)}")`,
            }}
            aria-label={`Screenshot ${index + 1}: ${screenshot.file_name}`}
          >
            {index === 0 && hasMultipleScreenshots && (
              <span className="screenshot-overlay">
                +{screenshots.length - 1} more
              </span>
            )}
          </button>
        ))}
        {screenshots.length === 0 && (
          <div className="no-screenshots-placeholder">
            <Image size={20} />
            <span>No screenshots</span>
          </div>
        )}
      </div>

      <div className="card-footer">
        {application.google_form_link && (
          <a
            className="card-apply-btn"
            href={application.google_form_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Send size={13} />
            Apply
          </a>
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

function getPlaceholderForScreenshot(screenshot: ApplicationScreenshotRow): string {
  // Return a placeholder or a signed URL if available
  // For now, use a generic placeholder - in production you'd use a signed URL
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="80" height="60" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#e5e7eb"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="10" fill="#9ca3af">${screenshot.file_name.slice(0, 15)}</text>
    </svg>
  `)}`;
}