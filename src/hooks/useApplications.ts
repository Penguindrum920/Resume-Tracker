import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { ApplicationRow, ApplicationStatus, Database } from "../types";
import { isSupabaseConfigured, storageBucket, supabase } from "../lib/supabase";
import type { ApplicationFilters, ApplicationSort } from "../lib/applicationUtils";
import { emptyFilters, filterAndSortApplications } from "../lib/applicationUtils";
import { getDeadlineReminders } from "../lib/deadlines";
import type { DeadlineReminder } from "../lib/deadlines";

type AppInsert = Database["public"]["Tables"]["applications"]["Insert"];
type AppUpdate = Database["public"]["Tables"]["applications"]["Update"];

export function useApplications(session: Session | null) {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ApplicationFilters>(emptyFilters);
  const [sort, setSort] = useState<ApplicationSort>({ by: "applied_on", order: "newest" });

  const loadApplications = useCallback(async (user: User) => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", user.id)
      .order("applied_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error) setApplications(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setApplications([]);
      return;
    }
    void loadApplications(session.user);
  }, [session?.user?.id, loadApplications]);

  const filtered = useMemo(
    () => filterAndSortApplications(applications, query, filters, sort),
    [applications, query, filters, sort],
  );

  const reminders: DeadlineReminder[] = useMemo(
    () => getDeadlineReminders(applications),
    [applications],
  );

  const stats = useMemo(() => {
    const pending = applications.filter((a) => a.status === "applied").length;
    const review = applications.filter((a) => a.status === "review").length;
    const interviews = applications.filter((a) => a.status === "interview").length;
    const offers = applications.filter((a) => a.status === "offer").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    const deadlinesThisWeek = applications.filter((a) => {
      if (!a.deadline) return false;
      const now = new Date();
      const dl = new Date(`${a.deadline}T00:00:00`);
      const diff = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    }).length;

    return { total: applications.length, pending, review, interviews, offers, rejected, deadlinesThisWeek };
  }, [applications]);

  const createApplication = useCallback(
    async (
      form: {
        company: string;
        jobTitle: string;
        packageOffered: string;
        appliedOn: string;
        deadline: string;
        googleFormLink: string;
        offerType: string;
        jobDescription: string;
        notes: string;
      },
      files: { screenshot?: File | null; resume?: File | null },
    ) => {
      if (!supabase || !session?.user) return { error: "Not authenticated" };
      setBusy(true);

      const id = crypto.randomUUID();
      let screenshotPath: string | null = null;
      let resumePath: string | null = null;

      try {
        if (files.screenshot) {
          screenshotPath = await uploadFile(session.user.id, id, files.screenshot, "google-form");
        }
        if (files.resume) {
          resumePath = await uploadFile(session.user.id, id, files.resume, "resume");
        }

        const payload: AppInsert = {
          id,
          user_id: session.user.id,
          company: form.company.trim(),
          job_title: form.jobTitle.trim() || null,
          package_offered: form.packageOffered.trim() || null,
          applied_on: form.appliedOn || new Date().toISOString().slice(0, 10),
          deadline: form.deadline || null,
          google_form_link: form.googleFormLink.trim() || null,
          offer_type: form.offerType as ApplicationRow["offer_type"],
          status: "applied",
          job_description: form.jobDescription.trim() || "",
          google_form_screenshot_path: screenshotPath,
          resume_path: resumePath,
          notes: form.notes.trim() || null,
        };

        let { data, error } = await supabase
          .from("applications")
          .insert(payload)
          .select("*")
          .single();

        if (error && /column.*not (found|exist)|could not find|does not exist|schema cache/i.test(error.message)) {
          const fallback: AppInsert = {
            id,
            user_id: session.user.id,
            company: form.company.trim(),
            job_title: form.jobTitle.trim() || null,
            applied_on: form.appliedOn || new Date().toISOString().slice(0, 10),
            offer_type: form.offerType as ApplicationRow["offer_type"],
            status: "applied",
            job_description: form.jobDescription.trim() || "",
            google_form_screenshot_path: screenshotPath,
            resume_path: resumePath,
            notes: form.notes.trim() || null,
          };
          const retry = await supabase
            .from("applications")
            .insert(fallback)
            .select("*")
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (error) throw error;
        setApplications((current) => [data!, ...current]);
        setBusy(false);
        return { data, error: null };
      } catch (err) {
        setBusy(false);
        if (err && typeof err === "object" && "message" in err) {
          const msg = (err as { message: string; details?: string; hint?: string }).message;
          const details = (err as { details?: string }).details;
          return { error: details ? `${msg}: ${details}` : msg };
        }
        return { error: err instanceof Error ? err.message : "Could not save. Check console for details." };
      }
    },
    [session?.user],
  );

  const updateApplication = useCallback(
    async (
      id: string,
      form: {
        company: string;
        jobTitle: string;
        packageOffered: string;
        appliedOn: string;
        deadline: string;
        googleFormLink: string;
        offerType: string;
        status: ApplicationStatus;
        jobDescription: string;
        notes: string;
      },
    ) => {
      if (!supabase) return { error: "Not configured" };
      setBusy(true);

      try {
        const updatePayload: AppUpdate = {
          company: form.company.trim(),
          job_title: form.jobTitle.trim() || null,
          package_offered: form.packageOffered.trim() || null,
          applied_on: form.appliedOn || new Date().toISOString().slice(0, 10),
          deadline: form.deadline || null,
          google_form_link: form.googleFormLink.trim() || null,
          offer_type: form.offerType as ApplicationRow["offer_type"],
          status: form.status,
          job_description: form.jobDescription.trim() || "",
          notes: form.notes.trim() || null,
        };

        let { data, error } = await supabase
          .from("applications")
          .update(updatePayload)
          .eq("id", id)
          .select("*")
          .single();

        if (error && /column.*not (found|exist)|could not find|does not exist|schema cache/i.test(error.message)) {
          const fallback: AppUpdate = {
            company: form.company.trim(),
            job_title: form.jobTitle.trim() || null,
            applied_on: form.appliedOn || new Date().toISOString().slice(0, 10),
            offer_type: form.offerType as ApplicationRow["offer_type"],
            status: form.status,
            job_description: form.jobDescription.trim() || "",
            notes: form.notes.trim() || null,
          };
          const retry = await supabase
            .from("applications")
            .update(fallback)
            .eq("id", id)
            .select("*")
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (error) throw error;
        setApplications((current) => current.map((a) => (a.id === data!.id ? data! : a)));
        setBusy(false);
        return { data, error: null };
      } catch (err) {
        setBusy(false);
        return { error: err instanceof Error ? err.message : "Could not update." };
      }
    },
    [],
  );

  const updateStatus = useCallback(
    async (application: ApplicationRow, status: ApplicationStatus) => {
      if (!supabase) return;
      setBusy(true);
      const { data, error } = await supabase
        .from("applications")
        .update({ status })
        .eq("id", application.id)
        .select("*")
        .single();
      if (!error && data) {
        setApplications((current) => current.map((a) => (a.id === data.id ? data : a)));
      }
      setBusy(false);
      return { error: error?.message };
    },
    [],
  );

  const deleteApplication = useCallback(
    async (application: ApplicationRow) => {
      if (!supabase) return;
      setBusy(true);

      const paths = [application.google_form_screenshot_path, application.resume_path].filter(
        Boolean,
      ) as string[];
      if (paths.length) {
        await supabase.storage.from(storageBucket).remove(paths);
      }

      const { error } = await supabase.from("applications").delete().eq("id", application.id);
      if (!error) {
        setApplications((current) => current.filter((a) => a.id !== application.id));
      }
      setBusy(false);
      return { error: error?.message };
    },
    [],
  );

  const openSignedFile = useCallback(
    async (path: string) => {
      if (!supabase) return { error: "Not configured" };
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .createSignedUrl(path, 60);
      if (error) return { error: error.message };
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      return { error: null };
    },
    [],
  );

  return {
    applications,
    filtered,
    reminders,
    stats,
    loading,
    busy,
    query,
    setQuery,
    filters,
    setFilters,
    sort,
    setSort,
    createApplication,
    updateApplication,
    updateStatus,
    deleteApplication,
    openSignedFile,
    loadApplications,
  };
}

async function uploadFile(
  userId: string,
  applicationId: string,
  file: File,
  slot: "google-form" | "resume",
) {
  if (!supabase) throw new Error("Supabase not configured");
  const safeName = file.name.replace(/[^a-z0-9.\-_]+/gi, "-").toLowerCase();
  const path = `${userId}/${applicationId}/${slot}-${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from(storageBucket)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: true,
    });
  if (error) throw error;
  return path;
}
