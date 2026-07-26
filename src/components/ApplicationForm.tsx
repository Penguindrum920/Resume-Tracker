import { FormEvent, useState } from "react";
import { FileImage, FileText, Plus, Pencil } from "lucide-react";
import type { ApplicationRow, OfferType } from "../types";
import { offerTypes, offerTypeLabels } from "../types";
import type { ApplicationFormErrors } from "../lib/validation";
import {
  type ApplicationFormState,
  hasErrors,
  validateApplicationForm,
} from "../lib/validation";
import { todayInputValue } from "../lib/deadlines";

const blankForm: ApplicationFormState = {
  company: "",
  jobTitle: "",
  packageOffered: "",
  appliedOn: todayInputValue(),
  deadline: "",
  googleFormLink: "",
  offerType: "internship",
  status: "applied",
  jobDescription: "",
  notes: "",
};

export function ApplicationForm({
  editingApplication,
  onSubmit,
  onCancel,
  busy,
}: {
  editingApplication?: ApplicationRow | null;
  onSubmit: (
    form: ApplicationFormState,
    files: { screenshot?: File | null; resume?: File | null },
  ) => Promise<{ error: string | null }>;
  onCancel?: () => void;
  busy: boolean;
}) {
  const [form, setForm] = useState<ApplicationFormState>(() => {
    if (editingApplication) {
      return {
        company: editingApplication.company,
        jobTitle: editingApplication.job_title ?? "",
        packageOffered: editingApplication.package_offered ?? "",
        appliedOn: editingApplication.applied_on,
        deadline: editingApplication.deadline ?? "",
        googleFormLink: editingApplication.google_form_link ?? "",
        offerType: editingApplication.offer_type,
        status: editingApplication.status,
        jobDescription: editingApplication.job_description,
        notes: editingApplication.notes ?? "",
      };
    }
    return blankForm;
  });

  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<ApplicationFormErrors>({});

  function update(field: keyof ApplicationFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validateApplicationForm(form);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }
    const result = await onSubmit(form, { screenshot: screenshotFile, resume: resumeFile });
    if (result.error) {
      setErrors({ company: result.error });
      return;
    }
    if (!editingApplication) {
      setForm(blankForm);
      setScreenshotFile(null);
      setResumeFile(null);
    }
  }

  const isEditing = Boolean(editingApplication);

  return (
    <form className="application-form" onSubmit={handleSubmit}>
      <label className={errors.company ? "has-error" : ""}>
        Company *
        <input
          required
          value={form.company}
          onChange={(e) => update("company", e.target.value)}
          placeholder="Company name"
        />
        {errors.company && <span className="field-error">{errors.company}</span>}
      </label>
      <label className={errors.jobTitle ? "has-error" : ""}>
        Role
        <input
          value={form.jobTitle}
          onChange={(e) => update("jobTitle", e.target.value)}
          placeholder="Software Engineer Intern"
        />
        {errors.jobTitle && <span className="field-error">{errors.jobTitle}</span>}
      </label>
      <label className={errors.packageOffered ? "has-error" : ""}>
        Package Offered
        <input
          value={form.packageOffered}
          onChange={(e) => update("packageOffered", e.target.value)}
          placeholder="8 LPA / 50k/month"
        />
        {errors.packageOffered && (
          <span className="field-error">{errors.packageOffered}</span>
        )}
      </label>
      <label className={errors.appliedOn ? "has-error" : ""}>
        Applied on
        <input
          type="date"
          value={form.appliedOn}
          onChange={(e) => update("appliedOn", e.target.value)}
        />
        {errors.appliedOn && <span className="field-error">{errors.appliedOn}</span>}
      </label>
      <label className={errors.deadline ? "has-error" : ""}>
        Deadline
        <input
          type="date"
          value={form.deadline}
          onChange={(e) => update("deadline", e.target.value)}
          min={form.appliedOn || undefined}
        />
        {errors.deadline && <span className="field-error">{errors.deadline}</span>}
      </label>
      <label className={errors.googleFormLink ? "has-error" : ""}>
        Google Form Link
        <input
          type="url"
          value={form.googleFormLink}
          onChange={(e) => update("googleFormLink", e.target.value)}
          placeholder="https://forms.gle/..."
        />
        {errors.googleFormLink && (
          <span className="field-error">{errors.googleFormLink}</span>
        )}
      </label>
      <label>
        Offer type
        <select
          value={form.offerType}
          onChange={(e) => update("offerType", e.target.value)}
        >
          {offerTypes.map((type) => (
            <option value={type} key={type}>
              {offerTypeLabels[type]}
            </option>
          ))}
        </select>
      </label>
      {isEditing && (
        <label>
          Status
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
          >
            <option value="applied">Applied</option>
            <option value="review">Review</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="expired">Expired</option>
          </select>
        </label>
      )}
      <label className="span-2">
        Job description
        <textarea
          value={form.jobDescription}
          onChange={(e) => update("jobDescription", e.target.value)}
          placeholder="Paste the job description here"
        />
      </label>
      <label className="span-2">
        Notes
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Referral, portal, recruiter name, next step"
        />
      </label>
      <FilePicker
        id="screenshot-upload"
        icon={<FileImage size={17} />}
        label="Google form screenshot"
        file={screenshotFile}
        accept="image/*"
        onChange={setScreenshotFile}
      />
      <FilePicker
        id="resume-upload"
        icon={<FileText size={17} />}
        label="Resume sent"
        file={resumeFile}
        accept=".pdf,.doc,.docx"
        onChange={setResumeFile}
      />
      <div className="form-actions">
        <button className="button primary" type="submit" disabled={busy}>
          {isEditing ? <Pencil size={17} /> : <Plus size={17} />}
          {isEditing ? "Update Application" : "Log Application"}
        </button>
        {isEditing && onCancel && (
          <button className="button secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function FilePicker({
  id,
  icon,
  label,
  file,
  accept,
  onChange,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  file: File | null;
  accept: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="file-picker" htmlFor={id}>
      <span>
        {icon}
        {label}
      </span>
      <strong>{file ? file.name : "Choose file"}</strong>
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </label>
  );
}
