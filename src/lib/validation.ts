import type { ApplicationStatus, OfferType } from "../types";

export type ApplicationFormState = {
  company: string;
  jobTitle: string;
  packageOffered: string;
  appliedOn: string;
  deadline: string;
  googleFormLink: string;
  offerType: OfferType;
  status: ApplicationStatus;
  jobDescription: string;
  notes: string;
};

export type ApplicationFormErrors = Partial<Record<keyof ApplicationFormState, string>>;

export function validateApplicationForm(form: ApplicationFormState) {
  const errors: ApplicationFormErrors = {};

  if (!form.company.trim()) {
    errors.company = "Company name is required.";
  }

  if (form.deadline && form.appliedOn && form.deadline < form.appliedOn) {
    errors.deadline = "Deadline cannot be before the applied date.";
  }

  const urlValidation = validateOptionalUrl(form.googleFormLink);
  if (!urlValidation.ok) {
    errors.googleFormLink = urlValidation.message;
  }

  return errors;
}

export function validateOptionalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, normalized: "" };

  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return {
        ok: false,
        normalized: trimmed,
        message: "Use an http or https link.",
      };
    }

    return { ok: true, normalized: parsed.toString() };
  } catch {
    return {
      ok: false,
      normalized: trimmed,
      message: "Enter a valid full URL, including https://.",
    };
  }
}

export function hasErrors(errors: ApplicationFormErrors) {
  return Object.values(errors).some(Boolean);
}
