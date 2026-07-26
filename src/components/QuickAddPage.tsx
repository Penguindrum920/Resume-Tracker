import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  ClipboardPaste,
  FileText,
  Sparkles,
} from "lucide-react";
import { parsePlacementMessage, type ParsedApplication } from "../lib/placementParser";
import { offerTypes, offerTypeLabels } from "../types";
import { todayInputValue } from "../lib/deadlines";
import type { ApplicationFormState } from "../lib/validation";

type View = "dashboard" | "quickadd";

export function QuickAddPage({
  onBack,
  onCreateApplication,
  busy,
}: {
  onBack: () => void;
  onCreateApplication: (
    form: ApplicationFormState,
    files: { screenshot?: File | null; resume?: File | null },
  ) => Promise<{ error: string | null }>;
  busy: boolean;
}) {
  const [rawMessage, setRawMessage] = useState("");
  const [parsed, setParsed] = useState<ParsedApplication | null>(null);
  const [editForm, setEditForm] = useState<ApplicationFormState | null>(null);
  const [saved, setSaved] = useState(false);

  function handleParse() {
    if (!rawMessage.trim()) return;
    const result = parsePlacementMessage(rawMessage);
    setParsed(result);
    setEditForm({
      company: result.company,
      jobTitle: result.jobTitle,
      packageOffered: result.packageOffered,
      appliedOn: todayInputValue(),
      deadline: result.deadline,
      googleFormLink: result.googleFormLink,
      offerType: result.offerType,
      status: "applied",
      jobDescription: result.jobDescription,
      notes: result.notes,
    });
    setSaved(false);
  }

  function handlePaste() {
    navigator.clipboard.readText().then((text) => {
      if (text) {
        setRawMessage(text);
        setParsed(null);
        setEditForm(null);
        setSaved(false);
      }
    }).catch(() => {});
  }

  async function handleConfirm() {
    if (!editForm) return;
    const result = await onCreateApplication(editForm, {});
    if (!result.error) {
      setSaved(true);
      setRawMessage("");
      setParsed(null);
      setEditForm(null);
    }
  }

  function updateEdit(field: keyof ApplicationFormState, value: string) {
    setEditForm((current) => (current ? { ...current, [field]: value } : null));
  }

  return (
    <section className="workspace quickadd-page">
      <header className="topbar">
        <div>
          <button className="text-button back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <h1>Quick Add</h1>
          <p className="topbar-subtitle">
            Paste a WhatsApp placement message and let the parser do the work.
          </p>
        </div>
      </header>

      {saved && (
        <div className="notice success-notice">
          <CheckCircle size={16} />
          Application saved successfully!
        </div>
      )}

      <section className="panel-card quickadd-input-section">
        <h2 className="panel-title">
          <ClipboardPaste size={16} />
          Paste Message
        </h2>
        <textarea
          className="quickadd-textarea"
          value={rawMessage}
          onChange={(e) => {
            setRawMessage(e.target.value);
            setParsed(null);
            setEditForm(null);
            setSaved(false);
          }}
          placeholder="Paste the entire placement WhatsApp message here..."
          rows={12}
        />
        <div className="quickadd-actions">
          <button className="button secondary" onClick={handlePaste}>
            <ClipboardPaste size={15} />
            Paste from Clipboard
          </button>
          <button
            className="button primary"
            onClick={handleParse}
            disabled={!rawMessage.trim()}
          >
            <Sparkles size={15} />
            Parse Message
          </button>
        </div>
      </section>

      {parsed && editForm && (
        <section className="panel-card quickadd-preview-section">
          <h2 className="panel-title">
            <FileText size={16} />
            Parsed Preview
          </h2>
          <p className="preview-hint">
            Review and edit the extracted data below. Nothing is saved until you click Confirm.
          </p>
          <form className="quickadd-edit-form" onSubmit={(e) => { e.preventDefault(); handleConfirm(); }}>
            <label>
              Company
              <input
                value={editForm.company}
                onChange={(e) => updateEdit("company", e.target.value)}
              />
            </label>
            <label>
              Role
              <input
                value={editForm.jobTitle}
                onChange={(e) => updateEdit("jobTitle", e.target.value)}
              />
            </label>
            <label>
              Package Offered
              <input
                value={editForm.packageOffered}
                onChange={(e) => updateEdit("packageOffered", e.target.value)}
              />
            </label>
            <label>
              Deadline
              <input
                type="date"
                value={editForm.deadline}
                onChange={(e) => updateEdit("deadline", e.target.value)}
              />
            </label>
            <label>
              Google Form Link
              <input
                type="url"
                value={editForm.googleFormLink}
                onChange={(e) => updateEdit("googleFormLink", e.target.value)}
                placeholder="https://forms.gle/..."
              />
            </label>
            <label>
              Offer Type
              <select
                value={editForm.offerType}
                onChange={(e) => updateEdit("offerType", e.target.value)}
              >
                {offerTypes.map((type) => (
                  <option value={type} key={type}>
                    {offerTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="span-2">
              Job Description
              <textarea
                value={editForm.jobDescription}
                onChange={(e) => updateEdit("jobDescription", e.target.value)}
                rows={5}
              />
            </label>
            <label className="span-2">
              Notes
              <textarea
                value={editForm.notes}
                onChange={(e) => updateEdit("notes", e.target.value)}
                rows={4}
              />
            </label>
            <div className="form-actions">
              <button className="button primary" type="submit" disabled={busy}>
                <CheckCircle size={16} />
                Confirm & Save
              </button>
            </div>
          </form>
        </section>
      )}
    </section>
  );
}
