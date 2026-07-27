import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { ApplicationRow, ApplicationStatus, Database, ApplicationScreenshotRow } from "../types";
import { isSupabaseConfigured, storageBucket, supabase } from "../lib/supabase";
import type { ApplicationFilters, ApplicationSort } from "../lib/applicationUtils";
import { emptyFilters, filterAndSortApplications } from "../lib/applicationUtils";
import { getDeadlineReminders } from "../lib/deadlines";
import type { DeadlineReminder } from "../lib/deadlines";

type AppInsert = Database["public"]["Tables"]["applications"]["Insert"];
type AppUpdate = Database["public"]["Tables"]["applications"]["Update"];
type ScreenshotInsert = Database["public"]["Tables"]["application_screenshots"]["Insert"];
type ScreenshotUpdate = Database["public"]["Tables"]["application_screenshots"]["Update"];

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
    const { data: apps, error } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", user.id)
      .order("applied_on", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && apps) {
      // Fetch screenshots for all applications
      const appIds = apps.map((a) => a.id);
      const { data: screenshots } = await supabase
        .from("application_screenshots")
        .select("*")
        .in("application_id", appIds)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      // Group screenshots by application_id
      const screenshotsByApp = new Map<string, ApplicationScreenshotRow[]>();
      screenshots?.forEach((s) => {
        const existing = screenshotsByApp.get(s.application_id) ?? [];
        existing.push(s);
        screenshotsByApp.set(s.application_id, existing);
      });

      // Attach screenshots to applications
      const appsWithScreenshots = apps.map((app) => ({
        ...app,
        screenshots: screenshotsByApp.get(app.id) ?? [],
      }));

      setApplications(appsWithScreenshots);
    }
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
      files: { screenshots?: File[]; resume?: File | null },
    ) => {
      if (!supabase || !session?.user) return { error: "Not authenticated" };
      setBusy(true);

      const id = crypto.randomUUID();
      let resumePath: string | null = null;

      try {
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

        // Upload screenshots
        let screenshots: ApplicationScreenshotRow[] = [];
        if (files.screenshots && files.screenshots.length > 0) {
          screenshots = await uploadScreenshots(session.user.id, id, files.screenshots, 0);
        }

        const newApp = { ...data!, screenshots };
        setApplications((current) => [newApp, ...current]);
        setBusy(false);
        return { data: newApp, error: null };
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
      files?: { screenshots?: File[]; resume?: File | null; existingScreenshotIds?: string[] },
    ) => {
      if (!supabase) return { error: "Not configured" };
      setBusy(true);

      try {
        let resumePath: string | null = null;
        if (files?.resume) {
          // Get current application to find user_id
          const currentApp = applications.find((a) => a.id === id);
          if (currentApp) {
            resumePath = await uploadFile(currentApp.user_id, id, files.resume, "resume");
          }
        }

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
          ...(resumePath && { resume_path: resumePath }),
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

        // Handle screenshots
        let screenshots: ApplicationScreenshotRow[] = [];
        const currentApp = applications.find((a) => a.id === id);
        const existingScreenshots = currentApp?.screenshots ?? [];

        // Delete screenshots not in existingScreenshotIds
        if (files?.existingScreenshotIds) {
          const toDelete = existingScreenshots.filter(
            (s) => !files.existingScreenshotIds!.includes(s.id),
          );
          for (const s of toDelete) {
            await deleteScreenshot(s.id);
          }
          screenshots = existingScreenshots.filter((s) =>
            files.existingScreenshotIds!.includes(s.id),
          );
        } else {
          screenshots = existingScreenshots;
        }

        // Upload new screenshots
        if (files?.screenshots && files.screenshots.length > 0) {
          const newScreenshots = await uploadScreenshots(
            currentApp!.user_id,
            id,
            files.screenshots,
            screenshots.length,
          );
          screenshots = [...screenshots, ...newScreenshots];
        }

        const updatedApp = { ...data!, screenshots };
        setApplications((current) => current.map((a) => (a.id === id ? updatedApp : a)));
        setBusy(false);
        return { data: updatedApp, error: null };
      } catch (err) {
        setBusy(false);
        return { error: err instanceof Error ? err.message : "Could not update." };
      }
    },
    [applications],
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
        setApplications((current) =>
          current.map((a) => (a.id === data.id ? { ...data, screenshots: a.screenshots } : a)),
        );
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

      // Delete screenshots from storage
      const screenshotPaths = application.screenshots?.map((s) => s.storage_path).filter(Boolean) ?? [];
      const paths = [application.resume_path, ...screenshotPaths].filter(Boolean) as string[];
      if (paths.length) {
        await supabase.storage.from(storageBucket).remove(paths);
      }

      // Delete screenshots from database (cascade should handle this, but be explicit)
      if (application.screenshots?.length) {
        await supabase.from("application_screenshots").delete().eq("application_id", application.id);
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

  // Screenshot operations
  const addScreenshots = useCallback(
    async (applicationId: string, files: File[]) => {
      if (!supabase || !session?.user) return { error: "Not authenticated" };
      const app = applications.find((a) => a.id === applicationId);
      if (!app) return { error: "Application not found" };

      try {
        const newScreenshots = await uploadScreenshots(session.user.id, applicationId, files, app.screenshots?.length ?? 0);
        setApplications((current) =>
          current.map((a) =>
            a.id === applicationId ? { ...a, screenshots: [...(a.screenshots ?? []), ...newScreenshots] } : a,
          ),
        );
        return { data: newScreenshots, error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Failed to upload screenshots" };
      }
    },
    [session?.user, applications],
  );

  const removeScreenshot = useCallback(
    async (screenshotId: string) => {
      if (!supabase) return { error: "Not configured" };
      try {
        await deleteScreenshot(screenshotId);
        setApplications((current) =>
          current.map((a) => ({
            ...a,
            screenshots: a.screenshots?.filter((s) => s.id !== screenshotId) ?? [],
          })),
        );
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Failed to delete screenshot" };
      }
    },
    [],
  );

  const reorderScreenshots = useCallback(
    async (applicationId: string, screenshotIds: string[]) => {
      if (!supabase) return { error: "Not configured" };
      try {
        for (let i = 0; i < screenshotIds.length; i++) {
          await supabase
            .from("application_screenshots")
            .update({ display_order: i })
            .eq("id", screenshotIds[i])
            .eq("application_id", applicationId);
        }
        setApplications((current) =>
          current.map((a) => {
            if (a.id !== applicationId) return a;
            const reordered = screenshotIds
              .map((id) => a.screenshots?.find((s) => s.id === id))
              .filter(Boolean) as ApplicationScreenshotRow[];
            return { ...a, screenshots: reordered };
          }),
        );
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Failed to reorder" };
      }
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
    addScreenshots,
    removeScreenshot,
    reorderScreenshots,
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

async function uploadScreenshots(
  userId: string,
  applicationId: string,
  files: File[],
  startDisplayOrder: number,
): Promise<ApplicationScreenshotRow[]> {
  if (!supabase) throw new Error("Supabase not configured");

  const results: ApplicationScreenshotRow[] = [];
  const uploadedPaths: string[] = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = file.name.replace(/[^a-z0-9.\-_]+/gi, "-").toLowerCase();
      const timestamp = Date.now() + i;
      const path = `${userId}/${applicationId}/screenshots/${timestamp}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type || "image/png",
          upsert: true,
        });

      if (uploadError) throw uploadError;
      uploadedPaths.push(path);

      const payload: ScreenshotInsert = {
        application_id: applicationId,
        user_id: userId,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || "image/png",
        display_order: startDisplayOrder + i,
      };

      const { data, error } = await supabase
        .from("application_screenshots")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        await supabase.storage.from(storageBucket).remove(uploadedPaths);
        throw error;
      }

      results.push(data!);
    }
    return results;
  } catch (err) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(storageBucket).remove(uploadedPaths);
    }
    throw err;
  }
}

async function deleteScreenshot(screenshotId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase not configured" };

  // Get storage path first
  const { data: screenshot, error: fetchError } = await supabase
    .from("application_screenshots")
    .select("storage_path")
    .eq("id", screenshotId)
    .single();

  if (fetchError) return { error: fetchError.message };

  // Delete from storage
  if (screenshot?.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(storageBucket)
      .remove([screenshot.storage_path]);
    if (storageError) console.error("Storage delete error:", storageError);
  }

  // Delete from database
  const { error } = await supabase.from("application_screenshots").delete().eq("id", screenshotId);

  return { error: error?.message ?? null };
}