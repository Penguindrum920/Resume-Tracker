import {
  PublicClientApplication,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import type { ApplicationRow } from "../types";
import { supabase } from "./supabase";
import {
  SPREADSHEET_HEADERS,
  applicationsToSpreadsheetRows,
  type SyncResult,
  type SyncProgress,
} from "./syncService";

const EXCEL_CLIENT_ID = import.meta.env.VITE_EXCEL_CLIENT_ID ?? "";
const SCOPES = ["Files.ReadWrite"];
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const APP_FOLDER_PATH = "/me/drive/special/approot:/ResumeTracker.xlsx";
const WORKSHEET_NAME = "Sheet1";

let currentAccessToken: string | null = null;
let tokenExpiresAt = 0;
let msalApp: PublicClientApplication | null = null;

// ── MSAL (Microsoft Authentication Library) ────────────────────────────────

async function getMsalApp(): Promise<PublicClientApplication> {
  if (msalApp) return msalApp;
  if (!EXCEL_CLIENT_ID) {
    throw new Error(
      "Microsoft Client ID not configured. Set VITE_EXCEL_CLIENT_ID in your environment.",
    );
  }
  msalApp = new PublicClientApplication({
    auth: {
      clientId: EXCEL_CLIENT_ID,
      redirectUri: "/auth-callback.html",
    },
    cache: { cacheLocation: "sessionStorage" },
  });
  await msalApp.initialize();
  return msalApp;
}

async function loginAndSetActiveAccount(): Promise<void> {
  const app = await getMsalApp();
  const loginRequest = { scopes: SCOPES, prompt: "consent" as const };
  const result = await app.loginPopup(loginRequest);
  app.setActiveAccount(result.account);
}

async function requestAccessToken(): Promise<string> {
  const app = await getMsalApp();
  const account = app.getActiveAccount();
  if (!account) {
    await loginAndSetActiveAccount();
    return requestAccessToken();
  }
  try {
    const result = await app.acquireTokenSilent({
      scopes: SCOPES,
      account,
    });
    currentAccessToken = result.accessToken;
    tokenExpiresAt = result.expiresOn?.getTime() ?? Date.now() + 3600_000;
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      const result = await app.acquireTokenPopup({
        scopes: SCOPES,
        account,
      });
      currentAccessToken = result.accessToken;
      tokenExpiresAt = result.expiresOn?.getTime() ?? Date.now() + 3600_000;
      return result.accessToken;
    }
    throw err;
  }
}

async function getAccessToken(): Promise<string> {
  if (currentAccessToken && Date.now() < tokenExpiresAt - 60_000) {
    return currentAccessToken;
  }
  return requestAccessToken();
}

// ── Supabase persistence helpers ────────────────────────────────────────────

async function getIntegration(userId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "excel_online")
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
      provider: "excel_online",
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
    .eq("provider", "excel_online");
}

async function touchLastSync(userId: string) {
  if (!supabase) return;
  await supabase
    .from("user_integrations")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", "excel_online");
}

// ── Public helpers for SettingsPage ─────────────────────────────────────────

export interface ExcelConnectionState {
  connected: boolean;
  workbookId: string | null;
  providerEmail: string | null;
  lastSyncTime: string | null;
}

const EMPTY_STATE: ExcelConnectionState = {
  connected: false,
  workbookId: null,
  providerEmail: null,
  lastSyncTime: null,
};

export async function getExcelConnectionState(
  userId: string,
): Promise<ExcelConnectionState> {
  const row = await getIntegration(userId);
  if (!row) return EMPTY_STATE;
  return {
    connected: true,
    workbookId: row.spreadsheet_id,
    providerEmail: row.provider_account_email,
    lastSyncTime: row.last_sync_at,
  };
}

export async function connectExcel(userId: string): Promise<ExcelConnectionState> {
  console.log("[Excel] connectExcel: entering, userId =", userId);
  let token: string;
  try {
    token = await requestAccessToken();
  } catch (err) {
    console.error("[Excel] connectExcel: requestAccessToken threw", err);
    throw new Error("Failed to authenticate with Microsoft. Please try again.");
  }
  console.log("[Excel] connectExcel: got token, length =", token.length);
  if (!token) throw new Error("Failed to obtain Microsoft access token");

  const existing = await getIntegration(userId);
  console.log("[Excel] connectExcel: existing integration =", existing ? existing.id : "none");
  let workbookId = existing?.spreadsheet_id ?? null;

  if (workbookId) {
    console.log("[Excel] connectExcel: verifying existing workbook", workbookId);
    try {
      await graphFetch(`${GRAPH_BASE}/drive/items/${workbookId}`, token);
      console.log("[Excel] connectExcel: existing workbook verified OK");
    } catch (err) {
      console.warn("[Excel] connectExcel: workbook verification failed, will create new one", err);
      workbookId = null;
    }
  }

  if (!workbookId) {
    console.log("[Excel] connectExcel: creating new workbook…");
    workbookId = await createWorkbook(token);
    console.log("[Excel] connectExcel: workbook created, id =", workbookId);
  }

  let email: string | null = null;
  try {
    const me = (await graphFetch(`${GRAPH_BASE}/me`, token)) as Record<string, unknown>;
    email = (me.mail ?? me.userPrincipalName ?? null) as string | null;
    console.log("[Excel] connectExcel: got user email =", email);
  } catch (err) {
    console.warn("[Excel] connectExcel: failed to fetch user email (non-fatal)", err);
  }

  console.log("[Excel] connectExcel: saving integration to Supabase…");
  await upsertIntegration(userId, workbookId, email);
  console.log("[Excel] connectExcel: done");

  return {
    connected: true,
    workbookId,
    providerEmail: email,
    lastSyncTime: existing?.last_sync_at ?? null,
  };
}

export async function disconnectExcel(userId: string): Promise<void> {
  currentAccessToken = null;
  tokenExpiresAt = 0;
  if (msalApp) {
    msalApp.setActiveAccount(null);
    msalApp = null;
  }
  await removeIntegration(userId);
}

// ── Graph API helpers ──────────────────────────────────────────────────────

async function graphFetch(url: string, token: string, init?: RequestInit): Promise<unknown> {
  console.log("[Excel] graphFetch:", init?.method ?? "GET", url);
  const resp = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err.error?.message ?? `Graph API error (${resp.status})`;
    if (resp.status === 401 || resp.status === 403) {
      throw new Error("Microsoft session expired. Please reconnect.");
    }
    if (resp.status === 404) {
      throw new Error(
        "Workbook not found. It may have been deleted. Disconnect and reconnect to create a new one.",
      );
    }
    throw new Error(msg);
  }

  // 204 No Content (e.g. after DELETE)
  if (resp.status === 204) return null;
  return resp.json();
}

async function createWorkbook(token: string): Promise<string> {
  // Check if workbook already exists in app folder
  try {
    const existing = await graphFetch(`${GRAPH_BASE}${APP_FOLDER_PATH}`, token);
    if (existing && typeof existing === "object" && "id" in existing) {
      return (existing as { id: string }).id;
    }
  } catch {
    // Not found — create it
  }

  // Create workbook via upload session
  const resp = await fetch(
    `${GRAPH_BASE}${APP_FOLDER_PATH}:/createUploadSession`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item: {
          "@microsoft.graph.conflictBehavior": "replace",
          name: "ResumeTracker.xlsx",
        },
      }),
    },
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err.error?.message ?? "Failed to create workbook";
    if (resp.status === 403) throw new Error(`Permission denied: ${msg}`);
    throw new Error(msg);
  }

  const data = await resp.json();
  return data.id as string;
}

async function ensureHeaders(token: string, workbookId: string): Promise<void> {
  try {
    await graphFetch(
      `${GRAPH_BASE}/drive/items/${workbookId}/workbook/worksheets/${WORKSHEET_NAME}/range(address='A1:O1')`,
      token,
      {
        method: "PATCH",
        body: JSON.stringify({ values: [SPREADSHEET_HEADERS] }),
      },
    );
  } catch {
    // Worksheet may not exist yet — ignore; first write will create data
  }
}

async function getAllSheetRows(
  token: string,
  workbookId: string,
): Promise<Map<string, number>> {
  // Read all data rows (skip header row 1)
  const url = `${GRAPH_BASE}/drive/items/${workbookId}/workbook/worksheets/${WORKSHEET_NAME}/range(address='A2:O')`;
  const data = (await graphFetch(url, token)) as {
    values?: (string | number)[][];
  };

  const rows = data.values ?? [];
  const idToRow = new Map<string, number>();
  rows.forEach((row, index) => {
    const appId = String(row[0] ?? "");
    if (appId) idToRow.set(appId, index + 2); // 1-based, row 1 = headers
  });
  return idToRow;
}

async function writeRow(
  token: string,
  workbookId: string,
  rowNum: number,
  values: (string | number)[],
): Promise<void> {
  const endCol = String.fromCharCode(64 + SPREADSHEET_HEADERS.length);
  await graphFetch(
    `${GRAPH_BASE}/drive/items/${workbookId}/workbook/worksheets/${WORKSHEET_NAME}/range(address='A${rowNum}:${endCol}${rowNum}')`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ values: [values] }),
    },
  );
}

async function appendRows(
  token: string,
  workbookId: string,
  rows: (string | number)[][],
): Promise<void> {
  if (rows.length === 0) return;
  const endCol = String.fromCharCode(64 + SPREADSHEET_HEADERS.length);

  // Find the next empty row by reading used range
  let nextRow = 2; // default: after header
  try {
    const used = (await graphFetch(
      `${GRAPH_BASE}/drive/items/${workbookId}/workbook/worksheets/${WORKSHEET_NAME}/usedRange?$select=address`,
      token,
    )) as { address?: string };
    // address like "Sheet1!A1:O42" — extract the last row number
    if (used.address) {
      const match = used.address.match(/(\d+)$/);
      if (match) nextRow = parseInt(match[1], 10) + 1;
    }
  } catch {
    // Fallback: use 2
  }

  // Write all rows sequentially starting from nextRow
  for (let i = 0; i < rows.length; i++) {
    const rowNum = nextRow + i;
    await graphFetch(
      `${GRAPH_BASE}/drive/items/${workbookId}/workbook/worksheets/${WORKSHEET_NAME}/range(address='A${rowNum}:${endCol}${rowNum}')`,
      token,
      {
        method: "PATCH",
        body: JSON.stringify({ values: [rows[i]] }),
      },
    );
  }
}

async function deleteRows(
  token: string,
  workbookId: string,
  startRow: number,
  endRow: number,
): Promise<void> {
  // Graph API uses 0-based row index; our rows are 1-based (row 1 = headers)
  // So row 2 in the sheet = index 1 in the rows collection
  // Delete from highest index first to avoid shifting
  for (let row = endRow; row >= startRow; row--) {
    const rowIndex = row - 1; // Convert to 0-based
    await fetch(
      `${GRAPH_BASE}/drive/items/${workbookId}/workbook/worksheets/${WORKSHEET_NAME}/rows/${rowIndex}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  }
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

export async function syncToExcelOnline(
  userId: string,
  applications: ApplicationRow[],
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncResult> {
  try {
    let token: string;
    try {
      token = await getAccessToken();
    } catch {
      throw new Error("Not connected to Microsoft. Please connect first.");
    }

    const integration = await getIntegration(userId);
    const workbookId = integration?.spreadsheet_id;
    if (!workbookId) {
      throw new Error(
        "No workbook linked. Disconnect and reconnect to create one.",
      );
    }

    await ensureHeaders(token, workbookId);

    const existingRows = await getAllSheetRows(token, workbookId);
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
        await writeRow(token, workbookId, rowNum, rowToValues(row));
      }
      progress++;
      onProgress?.({ current: progress, total });
    }

    // 2. Deletes — sort descending so each removal doesn't shift prior targets
    const deletePositions = toDeleteIds
      .map((id) => existingRows.get(id)!)
      .sort((a, b) => b - a);
    for (const pos of deletePositions) {
      await deleteRows(token, workbookId, pos, pos);
      progress++;
      onProgress?.({ current: progress, total });
    }

    // 3. Appends new rows
    if (toCreate.length > 0) {
      const values = toCreate.map(rowToValues);
      await appendRows(token, workbookId, values);
      progress += toCreate.length;
      onProgress?.({ current: progress, total });
    }

    await touchLastSync(userId);

    return { error: null, syncedCount: applications.length };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Excel Online sync failed",
    };
  }
}
