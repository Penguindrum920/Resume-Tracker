import type { OfferType } from "../types";
import { todayInputValue, toDateInputValue } from "./deadlines";

export type ParsedApplication = {
  company: string;
  jobTitle: string;
  packageOffered: string;
  deadline: string;
  googleFormLink: string;
  offerType: OfferType;
  jobDescription: string;
  notes: string;
};

const roleWords =
  /(engineer|developer|analyst|intern|qa|testing|consultant|apprentice|trainee|designer|manager|associate|scientist|architect|platform|devops|data|software|full stack|frontend|backend)/i;

const sectionStopWords = [
  "registration",
  "apply here",
  "application form",
  "google form",
  "registration link",
  "deadline",
  "last date",
  "apply before",
  "closing date",
  "selection process",
  "important",
  "regards",
  "best regards",
];

const monthMap: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

export function parsePlacementMessage(raw: string): ParsedApplication {
  const cleaned = cleanMessage(raw);
  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const company = extractCompany(lines, cleaned);
  const jobTitle = extractRole(lines);
  const packageOffered = extractPackage(lines);
  const deadline = extractDeadline(lines, cleaned);
  const googleFormLink = extractApplicationLink(lines);
  const offerType = inferOfferType(cleaned);
  const jobDescription = extractSection(lines, [
    "job description",
    "jd",
    "what you'll be doing",
    "what you will be doing",
    "key responsibilities",
    "responsibilities",
  ]);
  const notes = extractNotes(lines, jobDescription);

  return {
    company,
    jobTitle,
    packageOffered,
    deadline,
    googleFormLink,
    offerType,
    jobDescription,
    notes,
  };
}

function cleanMessage(raw: string) {
  return raw
    .replace(/\r/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/\*/g, "")
    .replace(/[•●▪◦🔹]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractCompany(lines: string[], text: string) {
  const labeled = findLabeledValue(lines, ["company", "organization", "employer"]);
  if (labeled) return trimDecorations(labeled);

  const titleLine = lines.find((line) => {
    const lower = line.toLowerCase();
    return (
      lower.includes("campus") &&
      (lower.includes("hiring") || lower.includes("recruitment")) &&
      !lower.includes("dear students")
    );
  });

  const titledCompany =
    titleLine?.match(/(?:with|at|for)\s+([^|,]+?)(?:\s+\|\||\s+\||,|$)/i)?.[1] ??
    text.match(/inform you that\s+([^,.|*]+?)\s+(?:is|has|invites|opened)/i)?.[1];

  if (titledCompany) return trimDecorations(titledCompany);

  const firstUseful = lines.find((line) => {
    const lower = line.toLowerCase();
    return (
      line.length <= 80 &&
      !lower.startsWith("dear ") &&
      !lower.includes("greetings") &&
      !lower.includes("placement department") &&
      !lower.includes("registration")
    );
  });

  if (!firstUseful) return "";

  const firstSegment = splitTitle(firstUseful).find(
    (segment) =>
      !/ctc|package|salary|batch|hiring|registration|deadline/i.test(segment),
  );

  return trimDecorations(firstSegment ?? firstUseful);
}

function extractRole(lines: string[]) {
  const labeled = findLabeledValue(lines, [
    "role",
    "position",
    "job title",
    "designation",
    "profile",
    "available roles",
  ]);

  if (labeled) return trimDecorations(labeled);

  for (const line of lines.slice(0, 12)) {
    const segment = splitTitle(line).find(
      (part) =>
        roleWords.test(part) &&
        !/ctc|package|salary|compensation|batch|campus|registration/i.test(part),
    );
    if (segment) return trimDecorations(segment);
  }

  return "";
}

function extractPackage(lines: string[]) {
  const labelPattern =
    /(ctc|package|salary|compensation|stipend|ppo package|gross annual salary|total compensation)/i;

  for (const line of lines) {
    if (!labelPattern.test(line)) continue;
    const afterLabel = line.replace(/^#+\s*/, "").split(/:\s*|-\s*/).slice(1).join(" - ");
    const value = afterLabel || line;
    const packageMatch = value.match(
      /(?:₹|rs\.?|inr)?\s*[0-9][0-9,]*(?:\.[0-9]+)?(?:\s*(?:-|–|to)\s*(?:₹|rs\.?|inr)?\s*[0-9][0-9,]*(?:\.[0-9]+)?)?\s*(?:lpa|lakhs?|lakh|k|per month|p\.a\.|pa|ctc)?/i,
    );
    return trimDecorations(packageMatch?.[0] ?? value);
  }

  const moneyLine = lines.find((line) =>
    /(?:₹|rs\.?|inr|\blpa\b|\blakhs?\b|\bstipend\b)/i.test(line),
  );

  return moneyLine ? trimDecorations(moneyLine) : "";
}

function extractDeadline(lines: string[], text: string) {
  const deadlineLabels = [
    "deadline",
    "last date",
    "last date to apply",
    "last date to register",
    "apply before",
    "registration ends",
    "registration deadline",
    "closing date",
  ];

  for (const [index, line] of lines.entries()) {
    if (!deadlineLabels.some((label) => line.toLowerCase().includes(label))) {
      continue;
    }

    const candidates = [line, lines[index + 1], lines[index + 2]]
      .filter(Boolean)
      .join(" ");
    const parsed = parseDateCandidate(candidates);
    if (parsed) return parsed;
  }

  return parseDateCandidate(text) ?? "";
}

function extractApplicationLink(lines: string[]) {
  const linkLabels = [
    "apply here",
    "registration link",
    "google form",
    "application form",
    "apply link",
    "registration",
  ];
  const urlPattern = /https?:\/\/[^\s<>"')]+/gi;

  for (const [index, line] of lines.entries()) {
    if (!linkLabels.some((label) => line.toLowerCase().includes(label))) {
      continue;
    }

    const nearby = [line, lines[index + 1], lines[index + 2]]
      .filter(Boolean)
      .join(" ");
    const url = nearby.match(urlPattern)?.[0];
    if (url) return normalizeExtractedUrl(url);
  }

  const allUrls = lines.join(" ").match(urlPattern) ?? [];
  const preferred = allUrls.find((url) =>
    /forms\.gle|docs\.google\.com\/forms|forms\.office\.com/i.test(url),
  );

  return preferred
    ? normalizeExtractedUrl(preferred)
    : allUrls[0]
      ? normalizeExtractedUrl(allUrls[0])
      : "";
}

function inferOfferType(text: string): OfferType {
  const lower = text.toLowerCase();
  const hasInternship =
    /\bintern(ship)?\b|apprentice|trainee|stipend|summer internship/.test(lower);
  const hasJob =
    /\bjob\b|full[-\s]?time|ppo|pre[-\s]?placement|employment|fte/.test(lower);

  if (/freelance/.test(lower)) return "freelance";
  if (/contract/.test(lower)) return "contract";
  if (hasInternship && hasJob) return "internship_job";
  if (hasInternship) return "internship";
  if (hasJob) return "job";
  return "other";
}

function extractSection(lines: string[], startLabels: string[]) {
  const startIndex = lines.findIndex((line) =>
    startLabels.some((label) => line.toLowerCase().includes(label)),
  );

  if (startIndex === -1) return "";

  const collected: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const lower = line.toLowerCase().replace(/[:#*-]/g, "").trim();
    const isHeading =
      line.length <= 44 &&
      (sectionStopWords.some((word) => lower.includes(word)) ||
        (/^[a-z\s&/]+$/i.test(lower) && lower.split(" ").length <= 4));

    if (collected.length > 0 && isHeading) break;
    collected.push(line);
  }

  return collected.join("\n").trim();
}

function extractNotes(lines: string[], jobDescription: string) {
  const noteSections = [
    "requirements",
    "eligibility",
    "eligible branches",
    "selection process",
    "important instructions",
    "location",
    "duration",
    "openings",
    "bond",
  ];

  const sections = noteSections
    .map((label) => {
      const value = extractSection(lines, [label]);
      return value ? `${toTitleCase(label)}\n${value}` : "";
    })
    .filter(Boolean);

  const compact = sections.join("\n\n").trim();
  if (compact) return compact;

  const shortLines = lines
    .filter(
      (line) =>
        !jobDescription.includes(line) &&
        !/https?:\/\/|registration link|apply here|deadline|last date/i.test(line),
    )
    .slice(0, 10);

  return shortLines.join("\n").trim();
}

function findLabeledValue(lines: string[], labels: string[]) {
  for (const [index, line] of lines.entries()) {
    const match = line.match(/^#{0,3}\s*([A-Za-z /&+-]+)\s*[:|-]\s*(.*)$/);
    if (!match) continue;

    const label = match[1].trim().toLowerCase();
    const matched = labels.some((candidate) => label.includes(candidate));
    if (!matched) continue;

    const currentValue = match[2]?.trim();
    if (currentValue) return currentValue;

    const next = lines[index + 1]?.trim();
    if (next && !next.includes(":")) return next;
  }

  return "";
}

function parseDateCandidate(value: string) {
  const normalized = value
    .replace(/\([^)]*\)/g, " ")
    .replace(/(\d+)(st|nd|rd|th)/gi, "$1")
    .replace(/\bat\b|\bby\b|,/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/\btoday\b/i.test(value)) return todayInputValue();
  if (/\btomorrow\b/i.test(value)) {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return toDateInputValue(date);
  }

  const numeric = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    const year = normalizeYear(Number(numeric[3]));
    return toDateInputValue(new Date(year, month, day));
  }

  const named = normalized.match(
    /\b(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{2,4}))?\b/i,
  );
  if (named) {
    const day = Number(named[1]);
    const month = monthMap[named[2].toLowerCase()];
    if (month === undefined) return "";
    const year = named[3]
      ? normalizeYear(Number(named[3]))
      : inferYearForMonthDay(month, day);
    return toDateInputValue(new Date(year, month, day));
  }

  const namedFirst = normalized.match(
    /\b([A-Za-z]{3,9})\s+(\d{1,2})(?:\s+(\d{2,4}))?\b/i,
  );
  if (namedFirst) {
    const month = monthMap[namedFirst[1].toLowerCase()];
    const day = Number(namedFirst[2]);
    if (month === undefined) return "";
    const year = namedFirst[3]
      ? normalizeYear(Number(namedFirst[3]))
      : inferYearForMonthDay(month, day);
    return toDateInputValue(new Date(year, month, day));
  }

  return "";
}

function inferYearForMonthDay(month: number, day: number) {
  const now = new Date();
  const candidate = new Date(now.getFullYear(), month, day);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  return candidate < ninetyDaysAgo ? now.getFullYear() + 1 : now.getFullYear();
}

function normalizeYear(year: number) {
  return year < 100 ? 2000 + year : year;
}

function splitTitle(line: string) {
  return line
    .split(/\|\||\||–|-|:/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function trimDecorations(value: string) {
  return value
    .replace(/^[#*\-\s]+/, "")
    .replace(/[#*\-\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeExtractedUrl(value: string) {
  return value.replace(/[.,;]+$/, "").trim();
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
