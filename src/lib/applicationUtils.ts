import type { ApplicationRow, ApplicationStatus, OfferType } from "../types";
import { offerTypeLabels, statusLabels } from "../types";

export type ApplicationFilters = {
  company: string;
  role: string;
  status: "all" | ApplicationStatus;
  offerType: "all" | OfferType;
  packageMin: string;
  packageMax: string;
  deadlineFrom: string;
  deadlineTo: string;
  appliedFrom: string;
  appliedTo: string;
};

export type SortBy = "deadline" | "applied_on" | "company" | "package" | "status";
export type SortOrder = "asc" | "desc" | "newest" | "oldest";

export type ApplicationSort = {
  by: SortBy;
  order: SortOrder;
};

const statusOrder: Record<ApplicationStatus, number> = {
  applied: 1,
  review: 2,
  interview: 3,
  offer: 4,
  rejected: 5,
  withdrawn: 6,
  expired: 7,
};

export const emptyFilters: ApplicationFilters = {
  company: "",
  role: "",
  status: "all",
  offerType: "all",
  packageMin: "",
  packageMax: "",
  deadlineFrom: "",
  deadlineTo: "",
  appliedFrom: "",
  appliedTo: "",
};

export function filterAndSortApplications(
  applications: ApplicationRow[],
  query: string,
  filters: ApplicationFilters,
  sort: ApplicationSort,
) {
  return applications
    .filter((application) => matchesSearch(application, query))
    .filter((application) => matchesFilters(application, filters))
    .sort((a, b) => compareApplications(a, b, sort));
}

export function getSearchBlob(application: ApplicationRow) {
  return [
    application.company,
    application.job_title,
    application.package_offered,
    application.notes,
    application.job_description,
    offerTypeLabels[application.offer_type],
    statusLabels[application.status],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function packageToLpa(value: string | null) {
  if (!value) return null;

  const lower = value.toLowerCase();
  const numbers = value
    .match(/[0-9][0-9,]*(?:\.[0-9]+)?/g)
    ?.map((part) => Number(part.replace(/,/g, "")))
    .filter((number) => Number.isFinite(number));

  if (!numbers?.length) return null;

  const amount = Math.max(...numbers);
  if (/\blpa\b|lakh|lakhs/.test(lower)) return amount;
  if (/per month|month|stipend/.test(lower)) return (amount * 12) / 100000;
  if (/₹|rs\.?|inr|salary|compensation|ctc|package/.test(lower) && amount > 1000) {
    return amount / 100000;
  }

  return amount;
}

function matchesSearch(application: ApplicationRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return getSearchBlob(application).includes(normalizedQuery);
}

function matchesFilters(application: ApplicationRow, filters: ApplicationFilters) {
  if (
    filters.company &&
    !application.company.toLowerCase().includes(filters.company.toLowerCase())
  ) {
    return false;
  }

  if (
    filters.role &&
    !(application.job_title ?? "")
      .toLowerCase()
      .includes(filters.role.toLowerCase())
  ) {
    return false;
  }

  if (filters.status !== "all" && application.status !== filters.status) {
    return false;
  }

  if (filters.offerType !== "all" && application.offer_type !== filters.offerType) {
    return false;
  }

  const packageValue = packageToLpa(application.package_offered);
  const minimum = filters.packageMin ? Number(filters.packageMin) : null;
  const maximum = filters.packageMax ? Number(filters.packageMax) : null;

  if (minimum !== null && (packageValue === null || packageValue < minimum)) {
    return false;
  }

  if (maximum !== null && (packageValue === null || packageValue > maximum)) {
    return false;
  }

  if (
    filters.deadlineFrom &&
    (!application.deadline || application.deadline < filters.deadlineFrom)
  ) {
    return false;
  }

  if (
    filters.deadlineTo &&
    (!application.deadline || application.deadline > filters.deadlineTo)
  ) {
    return false;
  }

  if (filters.appliedFrom && application.applied_on < filters.appliedFrom) {
    return false;
  }

  if (filters.appliedTo && application.applied_on > filters.appliedTo) {
    return false;
  }

  return true;
}

function compareApplications(
  a: ApplicationRow,
  b: ApplicationRow,
  sort: ApplicationSort,
) {
  const multiplier =
    sort.order === "asc" || sort.order === "oldest" ? 1 : -1;

  if (sort.by === "company") {
    return a.company.localeCompare(b.company) * multiplier;
  }

  if (sort.by === "status") {
    return (statusOrder[a.status] - statusOrder[b.status]) * multiplier;
  }

  if (sort.by === "package") {
    const aValue = packageToLpa(a.package_offered) ?? -Infinity;
    const bValue = packageToLpa(b.package_offered) ?? -Infinity;
    return (aValue - bValue) * multiplier;
  }

  const aDate = sort.by === "deadline" ? a.deadline : a.applied_on;
  const bDate = sort.by === "deadline" ? b.deadline : b.applied_on;

  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;

  return aDate.localeCompare(bDate) * multiplier;
}
