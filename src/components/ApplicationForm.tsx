import { FormEvent, useRef, useState, useCallback, DragEvent } from "react";
import {
  FileImage,
  FileText,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Upload,
  X,
} from "lucide-react";
import type { ApplicationRow, ApplicationScreenshotRow } from "../types";
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
    files: {
      screenshots?: File[];
      resume?: File | null;
      existingScreenshotIds?: string[];
    },
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

  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [existingScreenshots, setExistingScreenshots] = useState<
    ApplicationScreenshotRow[]
  >([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<ApplicationFormErrors>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(editingApplication);

  function update(field: keyof ApplicationFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function handleAddScreenshots(files: FileList | File[]) {
    const newFiles = Array.from(files);
    const validFiles = newFiles.filter((file) => {
      const validTypes = ["image/png", "image/jpeg", "image/webp"];
      if (!validTypes.includes(file.type)) {
        return false;
      }
      return true;
    });

    if (validFiles.length !== newFiles.length) {
      // Could show a toast here
    }

    setScreenshotFiles((current) => [...current, ...validFiles]);
  }

  function removeScreenshotFile(index: number) {
    setScreenshotFiles((current) => current.filter((_, i) => i !== index));
  }

  function removeExistingScreenshot(index: number) {
    setExistingScreenshots((current) => current.filter((_, i) => i !== index));
  }

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, index: number) => {
      if (busy) return;
      e.dataTransfer.setData("text/plain", index.toString());
      e.dataTransfer.effectAllowed = "move";
    },
    [busy],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, targetIndex: number) => {
      e.preventDefault();
      if (busy) return;
      const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
      if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

      if (sourceIndex < existingScreenshots.length) {
        // Moving an existing screenshot
        setExistingScreenshots((current) => {
          const newArr = [...current];
          const [removed] = newArr.splice(sourceIndex, 1);
          newArr.splice(targetIndex, 0, removed);
          return newArr;
        });
      } else if (targetIndex < existingScreenshots.length) {
        // Moving a new file before existing screenshots — swap between lists
        const newFileIndex = sourceIndex - existingScreenshots.length;
        setScreenshotFiles((current) => {
          const newFiles = [...current];
          const [removed] = newFiles.splice(newFileIndex, 1);
          // Insert the file as a placeholder - we'll handle the visual order differently
          return newFiles;
        });
      } else {
        // Moving within new files
        const fromIndex = sourceIndex - existingScreenshots.length;
        const toIndex = targetIndex - existingScreenshots.length;
        setScreenshotFiles((current) => {
          const newArr = [...current];
          const [removed] = newArr.splice(fromIndex, 1);
          newArr.splice(toIndex, 0, removed);
          return newArr;
        });
      }
    },
    [busy, existingScreenshots.length],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validateApplicationForm(form);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    const existingScreenshotIds = existingScreenshots.map((s) => s.id);
    const result = await onSubmit(form, {
      screenshots: screenshotFiles,
      resume: resumeFile,
      existingScreenshotIds,
    });

    if (result.error) {
      setErrors({ company: result.error });
      return;
    }

    if (!editingApplication) {
      setForm(blankForm);
      setScreenshotFiles([]);
      setExistingScreenshots([]);
      setResumeFile(null);
    }
  }

  return (
    <form className="application-form" onSubmit={handleSubmit}>
      <label className={errors.company ? "has-error" : ""}>
        Company *
        <input
          required
          value={form.company}
          onChange={(e) => update("company", e.target.value)}
          placeholder="Company name"
          disabled={busy}
        />
        {errors.company && <span className="field-error">{errors.company}</span>}
      </label>
      <label className={errors.jobTitle ? "has-error" : ""}>
        Role
        <input
          value={form.jobTitle}
          onChange={(e) => update("jobTitle", e.target.value)}
          placeholder="Software Engineer Intern"
          disabled={busy}
        />
        {errors.jobTitle && <span className="field-error">{errors.jobTitle}</span>}
      </label>
      <label className={errors.packageOffered ? "has-error" : ""}>
        Package Offered
        <input
          value={form.packageOffered}
          onChange={(e) => update("packageOffered", e.target.value)}
          placeholder="8 LPA / 50k/month"
          disabled={busy}
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
          disabled={busy}
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
          disabled={busy}
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
          disabled={busy}
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
          disabled={busy}
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
            disabled={busy}
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
          disabled={busy}
        />
      </label>
      <label className="span-2">
        Notes
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Referral, portal, recruiter name, next step"
          disabled={busy}
        />
      </label>

      <fieldset className="screenshots-upload">
        <legend>
          <FileImage size={17} />
          Screenshots
          <span className="screenshot-count">
            {existingScreenshots.length + screenshotFiles.length}
          </span>
        </legend>

        <div className="screenshots-list">
          {existingScreenshots.map((screenshot, index) => (
            <div
              key={screenshot.id}
              className="screenshot-item existing"
              draggable={!busy}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            >
              <span className="drag-handle" aria-label="Drag to reorder">
                <GripVertical size={16} />
              </span>
              <span className="screenshot-name" title={screenshot.file_name}>
                {screenshot.file_name}
              </span>
              <button
                type="button"
                className="screenshot-remove"
                onClick={() => removeExistingScreenshot(index)}
                disabled={busy}
                aria-label={`Remove ${screenshot.file_name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {screenshotFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="screenshot-item new"
              draggable={!busy}
              onDragStart={(e) =>
                handleDragStart(e, existingScreenshots.length + index)
              }
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, existingScreenshots.length + index)}
            >
              <span className="drag-handle" aria-label="Drag to reorder">
                <GripVertical size={16} />
              </span>
              <span className="screenshot-name" title={file.name}>
                {file.name}
              </span>
              <span className="screenshot-size">
                {(file.size / 1024).toFixed(1)} KB
              </span>
              <button
                type="button"
                className="screenshot-remove"
                onClick={() => removeScreenshotFile(existingScreenshots.length + index)}
                disabled={busy}
                aria-label={`Remove ${file.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <label className="screenshots-dropzone" htmlFor="screenshots-upload">
          <input
            ref={fileInputRef}
            id="screenshots-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(e) =>
              e.target.files && handleAddScreenshots(e.target.files)
            }
            disabled={busy}
            style={{ display: "none" }}
          />
          <div className="dropzone-content">
            <Upload size={24} />
            <span>
              {screenshotFiles.length === 0
                ? "Add Screenshots"
                : "Add More Screenshots"}
            </span>
            <small>PNG, JPG, WEBP &mdash; drag to reorder</small>
          </div>
        </label>
      </fieldset>

      <FilePicker
        id="resume-upload"
        icon={<FileText size={17} />}
        label="Resume sent"
        file={resumeFile}
        accept=".pdf,.doc,.docx"
        onChange={setResumeFile}
        disabled={busy}
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
  disabled,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  file: File | null;
  accept: string;
  onChange: (file: File | null) => void;
  disabled?: boolean;
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
        disabled={disabled}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </label>
  );
}