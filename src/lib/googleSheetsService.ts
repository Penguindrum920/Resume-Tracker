import type { ApplicationRow } from "../types";
import { supabase } from "./supabase";
import {
  SPREADSHEET_HEADERS,
  applicationsToSpreadsheetRows,
  type SyncResult,
  type SyncProgress,
} from "./syncService";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const SCOPES =
  "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";

let currentAccessToken: string | null = null;
let tokenExpiresAt = 0;
let gisLoaded = false;

// ── GIS (Google Identity Services) ──────────────────────────────────────────

async function loadGIS(): Promise<void> {
  if (gisLoaded && window.google?.accounts?.oauth2) return;
  if (document.getElementById("google-gsi-script")) {
    await waitForGIS();
    return;
  }
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.id = "google-gsi-script";
    script.onload = () => waitForGIS().then(resolve).catch(reject);
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

function waitForGIS(timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function poll() {
      if (window.google?.accounts?.oauth2) {
        gisLoaded = true;
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Google Identity Services failed to initialise"));
        return;
      }
      setTimeout(poll, 100);
    })();
  });
}

async function requestAccessToken(silent = false): Promise<string> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      "Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID in your environment.",
    );
  }
  await loadGIS();

  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      prompt: silent ? "" : "consent",
      callback(resp) {
        if (resp.error) {
          reject(new Error(resp.error));
          return;
        }
        currentAccessToken = resp.access_token;
        tokenExpiresAt = Date.now() + resp.expires_in * 1000;
        resolve(resp.access_token);
      },
      error_callback(err) {
        reject(new Error(err.type || "Google authentication failed"));
      },
    });
    client.requestAccessToken();
  });
}

async function getAccessToken(): Promise<string> {
  if (currentAccessToken && Date.now() < tokenExpiresAt - 60_000) {
    return currentAccessToken;
  }
  try {
    return await requestAccessToken(true);
  } catch {
    return requestAccessToken(false);
  }
}

// ── Supabase persistence helpers ────────────────────────────────────────────

async function getIntegration(userId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google_sheets")
    .maybeSingle();
  return data;
}

async function upsertIntegration(
  userId: string,
  spreadsheetId: string,
  email: string | null,
) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("user_integrations").upsert(
    {
      user_id: userId,
      provider: "google_sheets",
      spreadsheet_id: spreadsheetId,
      provider_account_email: email,
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw error;
}

async function removeIntegration(userId: string) {
  if (!supabase) return;
  await supabase
    .from("user_integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "google_sheets");
}

async function touchLastSync(userId: string) {
  if (!supabase) return;
  await supabase
    .from("user_integrations")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", "google_sheets");
}

// ── Public helpers for SettingsPage ─────────────────────────────────────────

export interface GoogleConnectionState {
  connected: boolean;
  spreadsheetId: string | null;
  providerEmail: string | null;
  lastSyncTime: string | null;
}

const EMPTY_STATE: GoogleConnectionState = {
  connected: false,
  spreadsheetId: null,
  providerEmail: null,
  lastSyncTime: null,
};

export async function getGoogleConnectionState(
  userId: string,
): Promise<GoogleConnectionState> {
  const row = await getIntegration(userId);
  if (!row) return EMPTY_STATE;
  return {
    connected: true,
    spreadsheetId: row.spreadsheet_id,
    providerEmail: row.provider_account_email,
    lastSyncTime: row.last_sync_at,
  };
}

export async function connectGoogle(userId: string): Promise<GoogleConnectionState> {
  const token = await requestAccessToken(false);
  if (!token) throw new Error("Failed to obtain Google access token");

  const existing = await getIntegration(userId);
  let spreadsheetId = existing?.spreadsheet_id ?? null;

  if (!spreadsheetId) {
    spreadsheetId = await createSpreadsheet(token);
    await upsertIntegration(userId, spreadsheetId, null);
  } else {
    await upsertIntegration(userId, spreadsheetId, null);
  }

  return {
    connected: true,
    spreadsheetId,
    providerEmail: null,
    lastSyncTime: existing?.last_sync_at ?? null,
  };
}

export async function disconnectGoogle(userId: string): Promise<void> {
  currentAccessToken = null;
  tokenExpiresAt = 0;
  await removeIntegration(userId);
}

// ── Sheets API helpers ──────────────────────────────────────────────────────

async function createSpreadsheet(token: string): Promise<string> {
  const resp = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: `ResumeTracker_${new Date().toISOString().split("T")[0]}`,
      },
      sheets: [{ properties: { title: "Applications" } }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err.error?.message ?? "Failed to create spreadsheet";
    if (resp.status === 403) throw new Error(`Permission denied: ${msg}`);
    throw new Error(msg);
  }

  const data = await resp.json();
  return data.spreadsheetId as string;
}

async function ensureHeaders(token: string, spreadsheetId: string): Promise<void> {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:O1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [SPREADSHEET_HEADERS] }),
    },
  );
}

async function getAllSheetRows(
  token: string,
  spreadsheetId: string,
): Promise<Map<string, number>> {
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:O`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!resp.ok) {
    if (resp.status === 404) {
      throw new Error(
        "Spreadsheet not found. It may have been deleted. Disconnect and reconnect to create a new one.",
      );
    }
    if (resp.status === 401 || resp.status === 403) {
      throw new Error("Google session expired. Please reconnect.");
    }
    return new Map();
  }

  const data = await resp.json();
  const rows: (string | number)[][] = data.values ?? [];
  const idToRow = new Map<string, number>();
  rows.forEach((row, index) => {
    const appId = String(row[0] ?? "");
    if (appId) idToRow.set(appId, index + 2); // 1-based, row 1 = headers
  });
  return idToRow;
}

async function writeRow(
  token: string,
  spreadsheetId: string,
  rowNum: number,
  values: (string | number)[],
): Promise<void> {
  const endCol = String.fromCharCode(64 + SPREADSHEET_HEADERS.length);
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A${rowNum}:${endCol}${rowNum}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [values] }),
    },
  );
}

async function appendRows(
  token: string,
  spreadsheetId: string,
  rows: (string | number)[][],
): Promise<void> {
  if (rows.length === 0) return;
  const endCol = String.fromCharCode(64 + SPREADSHEET_HEADERS.length);
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${endCol}1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: rows }),
    },
  );
}

async function deleteRows(
  token: string,
  spreadsheetId: string,
  startRow: number,
  endRow: number,
): Promise<void> {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0,
                dimension: "ROWS",
                startIndex: startRow - 1, // 0-based
                endIndex: endRow, // exclusive
              },
            },
          },
        ],
      }),
    },
  );
}

// ── Row conversion ──────────────────────────────────────────────────────────

function rowToValues(
  row: ReturnType<typeof applicationsToSpreadsheetRows>[0],
): (string | number)[] {
  return [
    row.applicationId,
    row.company,
    row.role,
    row.packageOffered,
    row.status,
    row.offerType,
    row.appliedDate,
    row.deadline,
    row.googleFormLink,
    row.resumeFile,
    row.screenshots,
    row.notes,
    row.jobDescription,
    row.createdDate,
    row.updatedDate,
  ];
}

// ── Sync entry point ────────────────────────────────────────────────────────

export async function syncToGoogleSheets(
  userId: string,
  applications: ApplicationRow[],
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncResult> {
  try {
    let token: string;
    try {
      token = await getAccessToken();
    } catch {
      throw new Error("Not connected to Google. Please connect first.");
    }

    const integration = await getIntegration(userId);
    const spreadsheetId = integration?.spreadsheet_id;
    if (!spreadsheetId) {
      throw new Error(
        "No spreadsheet linked. Disconnect and reconnect to create one.",
      );
    }

    await ensureHeaders(token, spreadsheetId);

    const existingRows = await getAllSheetRows(token, spreadsheetId);
    const newRows = applicationsToSpreadsheetRows(applications);

    const existingIds = new Set(existingRows.keys());
    const incomingIds = new Set(newRows.map((r) => r.applicationId));

    const toDeleteIds = [...existingIds].filter((id) => !incomingIds.has(id));
    const toUpdate = newRows.filter((r) => existingIds.has(r.applicationId));
    const toCreate = newRows.filter((r) => !existingIds.has(r.applicationId));

    let progress = 0;
    const total = toDeleteIds.length + toUpdate.length + toCreate.length;

    // 1. Updates first — indices are stable before any deletes
    for (const row of toUpdate) {
      const rowNum = existingRows.get(row.applicationId);
      if (rowNum !== undefined) {
        await writeRow(token, spreadsheetId, rowNum, rowToValues(row));
      }
      progress++;
      onProgress?.({ current: progress, total });
    }

    // 2. Deletes — sort descending so each removal doesn't shift prior targets
    const deletePositions = toDeleteIds
      .map((id) => existingRows.get(id)!)
      .sort((a, b) => b - a);
    for (const pos of deletePositions) {
      await deleteRows(token, spreadsheetId, pos, pos);
      progress++;
      onProgress?.({ current: progress, total });
    }

    // 3. Appends new rows
    if (toCreate.length > 0) {
      const values = toCreate.map(rowToValues);
      await appendRows(token, spreadsheetId, values);
      progress += toCreate.length;
      onProgress?.({ current: progress, total });
    }

    await touchLastSync(userId);

    return { error: null, syncedCount: applications.length };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Google Sheets sync failed",
    };
  }
}
