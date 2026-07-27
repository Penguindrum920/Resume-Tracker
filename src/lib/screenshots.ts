import type { ApplicationScreenshotRow } from "../types";
import { supabase, storageBucket, isSupabaseConfigured } from "./supabase";

type ScreenshotInsert = Omit<ApplicationScreenshotRow, "id" | "created_at" | "updated_at">;
type ScreenshotUpdate = Partial<Omit<ApplicationScreenshotRow, "id" | "application_id" | "user_id" | "created_at">>;

export async function getScreenshotsForApplication(applicationId: string): Promise<ApplicationScreenshotRow[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  
  const { data, error } = await supabase
    .from("application_screenshots")
    .select("*")
    .eq("application_id", applicationId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching screenshots:", error);
    return [];
  }
  return data ?? [];
}

export async function createScreenshot(
  userId: string,
  applicationId: string,
  file: File,
  displayOrder: number = 0
): Promise<ApplicationScreenshotRow | null> {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");

  const safeName = file.name.replace(/[^a-z0-9.\-_]+/gi, "-").toLowerCase();
  const timestamp = Date.now();
  const path = `${userId}/${applicationId}/screenshots/${timestamp}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(storageBucket)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "image/png",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const payload: ScreenshotInsert = {
    application_id: applicationId,
    user_id: userId,
    storage_path: path,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type || "image/png",
    display_order: displayOrder,
  };

  const { data, error } = await supabase
    .from("application_screenshots")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    // Try to clean up the uploaded file
    await supabase.storage.from(storageBucket).remove([path]);
    throw error;
  }

  return data;
}

export async function uploadMultipleScreenshots(
  userId: string,
  applicationId: string,
  files: File[],
  startDisplayOrder: number = 0
): Promise<ApplicationScreenshotRow[]> {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");

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
        // Clean up all uploaded files
        await supabase.storage.from(storageBucket).remove(uploadedPaths);
        throw error;
      }

      results.push(data!);
    }
    return results;
  } catch (err) {
    // Cleanup on any error
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(storageBucket).remove(uploadedPaths);
    }
    throw err;
  }
}

export async function updateScreenshot(
  screenshotId: string,
  updates: ScreenshotUpdate
): Promise<ApplicationScreenshotRow | null> {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("application_screenshots")
    .update(updates)
    .eq("id", screenshotId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteScreenshot(screenshotId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) return { error: "Supabase not configured" };

  // First get the storage path
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
  const { error } = await supabase
    .from("application_screenshots")
    .delete()
    .eq("id", screenshotId);

  return { error: error?.message ?? null };
}

export async function reorderScreenshots(
  applicationId: string,
  screenshotIds: string[]
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) return { error: "Supabase not configured" };

  try {
    for (let i = 0; i < screenshotIds.length; i++) {
      const { error } = await supabase
        .from("application_screenshots")
        .update({ display_order: i })
        .eq("id", screenshotIds[i])
        .eq("application_id", applicationId);
      if (error) throw error;
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to reorder" };
  }
}

export async function getSignedScreenshotUrl(path: string): Promise<{ url: string | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) return { url: null, error: "Supabase not configured" };

  const { data, error } = await supabase.storage
    .from(storageBucket)
    .createSignedUrl(path, 60);

  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}

export function getScreenshotCount(application: { screenshots?: ApplicationScreenshotRow[] }): number {
  return application.screenshots?.length ?? 0;
}

export function getScreenshotFileNames(application: { screenshots?: ApplicationScreenshotRow[] }): string {
  if (!application.screenshots?.length) return "";
  return application.screenshots.map(s => s.file_name).join(", ");
}

export function getScreenshotUrls(application: { screenshots?: ApplicationScreenshotRow[] }): string[] {
  if (!application.screenshots?.length) return [];
  return application.screenshots.map(s => s.storage_path);
}