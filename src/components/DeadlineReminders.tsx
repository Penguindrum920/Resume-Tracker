import {
  AlertTriangle,
  CalendarClock,
  CheckCircle,
  Clock,
  Timer,
} from "lucide-react";
import type { DeadlineReminder } from "../lib/deadlines";
import { EmptyState } from "./EmptyState";

const toneConfig: Record<string, { icon: typeof Clock; className: string }> = {
  today: { icon: AlertTriangle, className: "reminder-today" },
  tomorrow: { icon: Timer, className: "reminder-tomorrow" },
  "three-days": { icon: Clock, className: "reminder-three-days" },
  "seven-days": { icon: CalendarClock, className: "reminder-seven-days" },
  expired: { icon: CheckCircle, className: "reminder-expired" },
};

export function DeadlineReminders({
  reminders,
  onNavigate,
}: {
  reminders: DeadlineReminder[];
  onNavigate: (appId: string) => void;
}) {
  if (reminders.length === 0) {
    return (
      <section className="panel-card reminders-panel">
        <h2 className="panel-title">Upcoming Deadlines</h2>
        <EmptyState
          icon={<CheckCircle size={28} />}
          title="No upcoming deadlines"
          description="All clear! No deadlines in the next 7 days."
        />
      </section>
    );
  }

  return (
    <section className="panel-card reminders-panel">
      <h2 className="panel-title">
        <AlertTriangle size={16} />
        Upcoming Deadlines
      </h2>
      <div className="reminder-list">
        {reminders.map((reminder) => {
          const config = toneConfig[reminder.tone] ?? toneConfig.today;
          const Icon = config.icon;
          return (
            <button
              className={`reminder-card ${config.className}`}
              key={reminder.application.id}
              onClick={() => onNavigate(reminder.application.id)}
            >
              <Icon size={16} />
              <span className="reminder-text">{reminder.message}</span>
              <span className="reminder-badge">{reminder.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
