import type { ApplicationRow } from "../types";

export type DeadlineTone =
  | "today"
  | "tomorrow"
  | "three-days"
  | "seven-days"
  | "expired";

export type DeadlineReminder = {
  application: ApplicationRow;
  daysUntil: number;
  tone: DeadlineTone;
  label: string;
  message: string;
  rank: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function todayInputValue(date = new Date()) {
  return toDateInputValue(date);
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function daysBetweenDateInputs(target: string, base = todayInputValue()) {
  const targetTime = fromDateInputValue(target).getTime();
  const baseTime = fromDateInputValue(base).getTime();
  return Math.round((targetTime - baseTime) / DAY_MS);
}

export function getDeadlineReminder(
  application: ApplicationRow,
  baseDate = todayInputValue(),
): DeadlineReminder | null {
  if (!application.deadline) return null;

  const daysUntil = daysBetweenDateInputs(application.deadline, baseDate);
  const role = application.job_title ? ` (${application.job_title})` : "";

  if (daysUntil < 0) {
    return {
      application,
      daysUntil,
      tone: "expired",
      label: "Expired",
      message: `${application.company}${role} deadline expired ${Math.abs(
        daysUntil,
      )} day${Math.abs(daysUntil) === 1 ? "" : "s"} ago`,
      rank: 5,
    };
  }

  if (daysUntil === 0) {
    return {
      application,
      daysUntil,
      tone: "today",
      label: "Deadline Today",
      message: `${application.company}${role} deadline today`,
      rank: 1,
    };
  }

  if (daysUntil === 1) {
    return {
      application,
      daysUntil,
      tone: "tomorrow",
      label: "Deadline Tomorrow",
      message: `${application.company}${role} deadline tomorrow`,
      rank: 2,
    };
  }

  if (daysUntil <= 3) {
    return {
      application,
      daysUntil,
      tone: "three-days",
      label: "Within 3 Days",
      message: `${application.company}${role} deadline in ${daysUntil} days`,
      rank: 3,
    };
  }

  if (daysUntil <= 7) {
    return {
      application,
      daysUntil,
      tone: "seven-days",
      label: "Within 7 Days",
      message: `${application.company}${role} deadline in ${daysUntil} days`,
      rank: 4,
    };
  }

  return null;
}

export function getDeadlineReminders(applications: ApplicationRow[]) {
  return applications
    .map((application) => getDeadlineReminder(application))
    .filter((reminder): reminder is DeadlineReminder => Boolean(reminder))
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.daysUntil - b.daysUntil;
    });
}

export function isExpiredApplication(application: ApplicationRow) {
  return Boolean(
    application.deadline &&
      daysBetweenDateInputs(application.deadline) < 0 &&
      !["offer", "rejected", "withdrawn", "expired"].includes(application.status),
  );
}

export function isDeadlineThisWeek(application: ApplicationRow) {
  if (!application.deadline) return false;
  const daysUntil = daysBetweenDateInputs(application.deadline);
  return daysUntil >= 0 && daysUntil <= 7;
}
