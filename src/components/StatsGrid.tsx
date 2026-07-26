import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

type Stats = {
  total: number;
  pending: number;
  review: number;
  interviews: number;
  offers: number;
  rejected: number;
  deadlinesThisWeek: number;
};

export function StatsGrid({ stats }: { stats: Stats }) {
  const items = [
    { label: "Total", value: stats.total, icon: FolderKanban, color: "var(--teal)" },
    { label: "Pending", value: stats.pending, icon: Clock3, color: "var(--yellow)" },
    { label: "Review", value: stats.review, icon: Target, color: "#9b8dff" },
    { label: "Interviews", value: stats.interviews, icon: CalendarDays, color: "var(--blue)" },
    { label: "Offers", value: stats.offers, icon: CheckCircle2, color: "var(--lime)" },
    { label: "Rejected", value: stats.rejected, icon: AlertCircle, color: "var(--coral)" },
  ];

  return (
    <section className="stats-grid" aria-label="Application summary">
      {items.map((item) => (
        <div className="metric" key={item.label}>
          <item.icon size={18} style={{ color: item.color }} />
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
      <div className="metric metric-highlight">
        <Zap size={18} style={{ color: "var(--coral)" }} />
        <span>This Week</span>
        <strong>{stats.deadlinesThisWeek}</strong>
      </div>
    </section>
  );
}
