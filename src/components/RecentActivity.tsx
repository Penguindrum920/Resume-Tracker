import { Clock, FileText } from "lucide-react";
import type { ApplicationRow } from "../types";
import { statusLabels, offerTypeLabels } from "../types";

export function RecentActivity({
  applications,
  onNavigate,
}: {
  applications: ApplicationRow[];
  onNavigate: (appId: string) => void;
}) {
  const recent = applications.slice(0, 5);

  if (recent.length === 0) return null;

  return (
    <section className="panel-card recent-panel">
      <h2 className="panel-title">
        <Clock size={16} />
        Recent Activity
      </h2>
      <div className="recent-list">
        {recent.map((app) => (
          <button
            className="recent-item"
            key={app.id}
            onClick={() => onNavigate(app.id)}
          >
            <span className={`status-dot mini ${app.status}`} />
            <div className="recent-info">
              <strong>{app.company}</strong>
              <small>
                {app.job_title || "Role not specified"} &middot;{" "}
                {formatRelativeDate(app.applied_on)}
              </small>
            </div>
            <span className="recent-tag">{statusLabels[app.status]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}
