export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-subtitle" />
          <div className="skeleton-line skeleton-body" />
          <div className="skeleton-row">
            <div className="skeleton-badge" />
            <div className="skeleton-badge" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="stats-grid skeleton-stats">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="skeleton-stat" key={i}>
          <div className="skeleton-line" style={{ width: 40, height: 14 }} />
          <div className="skeleton-line" style={{ width: 50, height: 30 }} />
        </div>
      ))}
    </div>
  );
}
