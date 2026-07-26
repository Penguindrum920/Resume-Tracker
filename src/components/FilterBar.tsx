import { ChevronDown, ChevronUp, Filter, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import type { ApplicationFilters, ApplicationSort, SortBy, SortOrder } from "../lib/applicationUtils";
import { emptyFilters } from "../lib/applicationUtils";
import type { ApplicationStatus, OfferType } from "../types";
import { offerTypes, offerTypeLabels, statuses, statusLabels } from "../types";

export function FilterBar({
  filters,
  setFilters,
  sort,
  setSort,
  resultCount,
}: {
  filters: ApplicationFilters;
  setFilters: React.Dispatch<React.SetStateAction<ApplicationFilters>>;
  sort: ApplicationSort;
  setSort: React.Dispatch<React.SetStateAction<ApplicationSort>>;
  resultCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = Object.entries(filters).filter(
    ([key, value]) => key !== "status" && key !== "offerType" && value,
  ).length +
    (filters.status !== "all" ? 1 : 0) +
    (filters.offerType !== "all" ? 1 : 0);

  return (
    <div className="filter-bar">
      <div className="filter-bar-row">
        <div className="filter-info">
          <SlidersHorizontal size={15} />
          <span>{resultCount} result{resultCount !== 1 ? "s" : ""}</span>
          {activeCount > 0 && (
            <span className="filter-count">{activeCount} filter{activeCount !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="filter-controls">
          <SortSelect sort={sort} setSort={setSort} />
          <button
            className={`filter-toggle ${expanded ? "active" : ""}`}
            onClick={() => setExpanded((e) => !e)}
          >
            <Filter size={15} />
            Filters
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {activeCount > 0 && (
            <button
              className="filter-clear"
              onClick={() => setFilters(emptyFilters)}
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <FilterPanel filters={filters} setFilters={setFilters} />
      )}
    </div>
  );
}

function FilterPanel({
  filters,
  setFilters,
}: {
  filters: ApplicationFilters;
  setFilters: React.Dispatch<React.SetStateAction<ApplicationFilters>>;
}) {
  function update<K extends keyof ApplicationFilters>(key: K, value: ApplicationFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="filter-panel">
      <div className="filter-grid">
        <label>
          Company
          <input
            value={filters.company}
            onChange={(e) => update("company", e.target.value)}
            placeholder="Filter by company"
          />
        </label>
        <label>
          Role
          <input
            value={filters.role}
            onChange={(e) => update("role", e.target.value)}
            placeholder="Filter by role"
          />
        </label>
        <label>
          Status
          <select
            value={filters.status}
            onChange={(e) => update("status", e.target.value as "all" | ApplicationStatus)}
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option value={s} key={s}>{statusLabels[s]}</option>
            ))}
          </select>
        </label>
        <label>
          Offer Type
          <select
            value={filters.offerType}
            onChange={(e) => update("offerType", e.target.value as "all" | OfferType)}
          >
            <option value="all">All types</option>
            {offerTypes.map((t) => (
              <option value={t} key={t}>{offerTypeLabels[t]}</option>
            ))}
          </select>
        </label>
        <label>
          Min Package (LPA)
          <input
            type="number"
            min="0"
            step="0.5"
            value={filters.packageMin}
            onChange={(e) => update("packageMin", e.target.value)}
            placeholder="0"
          />
        </label>
        <label>
          Max Package (LPA)
          <input
            type="number"
            min="0"
            step="0.5"
            value={filters.packageMax}
            onChange={(e) => update("packageMax", e.target.value)}
            placeholder="50"
          />
        </label>
        <label>
          Deadline From
          <input
            type="date"
            value={filters.deadlineFrom}
            onChange={(e) => update("deadlineFrom", e.target.value)}
          />
        </label>
        <label>
          Deadline To
          <input
            type="date"
            value={filters.deadlineTo}
            onChange={(e) => update("deadlineTo", e.target.value)}
          />
        </label>
        <label>
          Applied From
          <input
            type="date"
            value={filters.appliedFrom}
            onChange={(e) => update("appliedFrom", e.target.value)}
          />
        </label>
        <label>
          Applied To
          <input
            type="date"
            value={filters.appliedTo}
            onChange={(e) => update("appliedTo", e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

function SortSelect({
  sort,
  setSort,
}: {
  sort: ApplicationSort;
  setSort: React.Dispatch<React.SetStateAction<ApplicationSort>>;
}) {
  return (
    <div className="sort-select">
      <select
        value={sort.by}
        onChange={(e) => setSort((current) => ({ ...current, by: e.target.value as SortBy }))}
      >
        <option value="applied_on">Applied Date</option>
        <option value="deadline">Deadline</option>
        <option value="company">Company</option>
        <option value="package">Package</option>
        <option value="status">Status</option>
      </select>
      <button
        className="sort-order-btn"
        onClick={() =>
          setSort((current) => ({
            ...current,
            order: current.order === "desc" || current.order === "newest" ? "asc" : "desc",
          }))
        }
        aria-label={`Sort ${sort.order === "desc" || sort.order === "newest" ? "ascending" : "descending"}`}
      >
        {sort.order === "desc" || sort.order === "newest" ? (
          <ChevronDown size={15} />
        ) : (
          <ChevronUp size={15} />
        )}
      </button>
    </div>
  );
}
