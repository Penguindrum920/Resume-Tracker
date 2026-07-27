import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Download,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings2,
  Plug,
  PlugZap,
  Clock,
  Database,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { ApplicationRow } from "../types";
import { exportApplications } from "../lib/export";
import type { SyncStatus } from "../lib/syncService";

export function SettingsPage({
  applications,
  session,
  onClose,
}: {
  applications: ApplicationRow[];
  session: Session;
  onClose: () => void;
}) {
  const [exportBusy, setExportBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    google: {
      connected: false,
      lastSyncTime: null,
      syncedRecords: 0,
      status: "idle",
      error: null,
    },
    excel: {
      connected: false,
      lastSyncTime: null,
      syncedRecords: 0,
      status: "idle",
      error: null,
    },
  });

  const userId = session.user.id;

  useEffect(() => {
    loadConnectionStates();
  }, [userId]);

  async function loadConnectionStates() {
    try {
      const [{ getGoogleConnectionState }, { getExcelConnectionState }] =
        await Promise.all([
          import("../lib/googleSheetsService"),
          import("../lib/excelOnlineService"),
        ]);
      const [googleState, excelState] = await Promise.all([
        getGoogleConnectionState(userId),
        getExcelConnectionState(userId),
      ]);
      setSyncStatus({
        google: {
          connected: googleState.connected,
          lastSyncTime: googleState.lastSyncTime,
          syncedRecords: googleState.connected ? applications.length : 0,
          status: "idle",
          error: null,
        },
        excel: {
          connected: excelState.connected,
          lastSyncTime: excelState.lastSyncTime,
          syncedRecords: excelState.connected ? applications.length : 0,
          status: "idle",
          error: null,
        },
      });
    } catch {
      // Not connected or Supabase unavailable
    }
  }

  function saveGoogleStatus(
    patch: Partial<SyncStatus["google"]>,
  ) {
    setSyncStatus((prev) => ({ ...prev, google: { ...prev.google, ...patch } }));
  }

  function saveExcelStatus(
    patch: Partial<SyncStatus["excel"]>,
  ) {
    setSyncStatus((prev) => ({ ...prev, excel: { ...prev.excel, ...patch } }));
  }

  async function handleExport(format: "xlsx" | "csv") {
    setExportBusy(true);
    try {
      await exportApplications({ applications, format });
    } catch (err) {
      console.error("Export failed:", err);
    }
    setExportBusy(false);
  }

  // ── Google Sheets ─────────────────────────────────────────────────────────

  async function handleConnectGoogle() {
    saveGoogleStatus({ status: "syncing", error: null });
    try {
      const { connectGoogle } = await import("../lib/googleSheetsService");
      const state = await connectGoogle(userId);
      saveGoogleStatus({
        connected: state.connected,
        lastSyncTime: state.lastSyncTime,
        status: "idle",
        error: null,
      });
    } catch (err) {
      saveGoogleStatus({
        status: "error",
        error: err instanceof Error ? err.message : "Failed to connect",
      });
    }
  }

  async function handleSyncGoogle() {
    saveGoogleStatus({ status: "syncing", error: null });
    try {
      const { syncToGoogleSheets } = await import("../lib/googleSheetsService");
      const result = await syncToGoogleSheets(userId, applications, (progress) => {
        saveGoogleStatus({ syncedRecords: progress.current, status: "syncing" });
      });
      if (result.error) {
        saveGoogleStatus({ status: "error", error: result.error });
      } else {
        saveGoogleStatus({
          connected: true,
          lastSyncTime: new Date().toISOString(),
          syncedRecords: applications.length,
          status: "success",
          error: null,
        });
      }
    } catch (err) {
      saveGoogleStatus({
        status: "error",
        error: err instanceof Error ? err.message : "Sync failed",
      });
    }
  }

  async function handleDisconnectGoogle() {
    try {
      const { disconnectGoogle } = await import("../lib/googleSheetsService");
      await disconnectGoogle(userId);
    } catch {
      // Best-effort disconnect
    }
    saveGoogleStatus({
      connected: false,
      lastSyncTime: null,
      syncedRecords: 0,
      status: "idle",
      error: null,
    });
  }

  // ── Excel Online ──────────────────────────────────────────────────────────

  async function handleConnectExcel() {
    console.log("[Settings] handleConnectExcel: entered");
    saveExcelStatus({ status: "syncing", error: null });
    try {
      console.log("[Settings] handleConnectExcel: importing excelOnlineService…");
      const { connectExcel } = await import("../lib/excelOnlineService");
      console.log("[Settings] handleConnectExcel: calling connectExcel…");
      const state = await connectExcel(userId);
      console.log("[Settings] handleConnectExcel: connectExcel returned", state);
      saveExcelStatus({
        connected: state.connected,
        lastSyncTime: state.lastSyncTime,
        status: "idle",
        error: null,
      });
    } catch (err) {
      console.error("[Settings] handleConnectExcel: caught error", err);
      saveExcelStatus({
        status: "error",
        error: err instanceof Error ? err.message : "Failed to connect",
      });
    }
  }

  async function handleSyncExcel() {
    saveExcelStatus({ status: "syncing", error: null });
    try {
      const { syncToExcelOnline } = await import("../lib/excelOnlineService");
      const result = await syncToExcelOnline(userId, applications, (progress) => {
        saveExcelStatus({ syncedRecords: progress.current, status: "syncing" });
      });
      if (result.error) {
        saveExcelStatus({ status: "error", error: result.error });
      } else {
        saveExcelStatus({
          connected: true,
          lastSyncTime: new Date().toISOString(),
          syncedRecords: applications.length,
          status: "success",
          error: null,
        });
      }
    } catch (err) {
      saveExcelStatus({
        status: "error",
        error: err instanceof Error ? err.message : "Sync failed",
      });
    }
  }

  async function handleDisconnectExcel() {
    try {
      const { disconnectExcel } = await import("../lib/excelOnlineService");
      await disconnectExcel(userId);
    } catch {
      // Best-effort disconnect
    }
    saveExcelStatus({
      connected: false,
      lastSyncTime: null,
      syncedRecords: 0,
      status: "idle",
      error: null,
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="settings-page" onClick={(e) => e.stopPropagation()}>
      <header className="settings-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Export & Spreadsheet Sync</h1>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close settings">
          <XCircle size={20} />
        </button>
      </header>

      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-header">
            <Download size={20} />
            <h2>Export Data</h2>
          </div>
          <p className="settings-card-desc">
            Export all {applications.length} applications to a spreadsheet file.
            Compatible with Microsoft Excel, Google Sheets, and LibreOffice Calc.
          </p>
          <div className="settings-actions">
            <button
              className="button primary"
              onClick={() => handleExport("xlsx")}
              disabled={exportBusy || applications.length === 0}
            >
              {exportBusy ? <Loader2 size={17} className="spin" /> : <FileSpreadsheet size={17} />}
              Export Excel (.xlsx)
            </button>
            <button
              className="button secondary"
              onClick={() => handleExport("csv")}
              disabled={exportBusy || applications.length === 0}
            >
              {exportBusy ? <Loader2 size={17} className="spin" /> : <Download size={17} />}
              Export CSV
            </button>
          </div>
          {applications.length === 0 && (
            <p className="settings-hint">
              <AlertTriangle size={14} />
              No applications to export.
            </p>
          )}
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <Plug size={20} />
            <h2>Google Sheets</h2>
          </div>
          <SyncProviderStatus
            name="Google Sheets"
            status={syncStatus.google}
            onConnect={!syncStatus.google.connected ? handleConnectGoogle : undefined}
            onSync={handleSyncGoogle}
            onDisconnect={handleDisconnectGoogle}
            totalRecords={applications.length}
            description="Sync your applications to a Google Sheet for real-time collaboration."
          />
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <PlugZap size={20} />
            <h2>Microsoft Excel Online</h2>
          </div>
          <SyncProviderStatus
            name="Excel Online"
            status={syncStatus.excel}
            onConnect={!syncStatus.excel.connected ? handleConnectExcel : undefined}
            onSync={handleSyncExcel}
            onDisconnect={handleDisconnectExcel}
            totalRecords={applications.length}
            description="Sync to OneDrive / Microsoft 365 for cloud-based Excel access."
          />
        </section>

        <section className="settings-card info-card">
          <div className="settings-card-header">
            <Database size={20} />
            <h2>Sync Architecture</h2>
          </div>
          <div className="settings-info">
            <p>
              <strong>Supabase</strong> is the primary source of truth for all application data.
              Spreadsheets are kept in sync as mirrors.
            </p>
            <ul>
              <li>Changes to the database automatically sync to connected spreadsheets.</li>
              <li>A unique Application ID ensures no duplicate rows are created.</li>
              <li>If both the spreadsheet and database are modified, Supabase wins.</li>
              <li>Connection metadata is stored securely in Supabase, not in your browser.</li>
            </ul>
          </div>
        </section>
      </div>
    </section>
  );
}

function SyncProviderStatus({
  name,
  status,
  onConnect,
  onSync,
  onDisconnect,
  totalRecords,
  description,
}: {
  name: string;
  status: {
    connected: boolean;
    lastSyncTime: string | null;
    syncedRecords: number;
    status: "idle" | "syncing" | "success" | "error";
    error: string | null;
  };
  onConnect?: () => void;
  onSync: () => void;
  onDisconnect: () => void;
  totalRecords: number;
  description: string;
}) {
  const isSyncing = status.status === "syncing";
  const hasError = status.status === "error" && status.error;

  return (
    <div className="sync-provider">
      <p className="settings-card-desc">{description}</p>

      <div className="sync-status-bar">
        <div className={`sync-badge ${status.connected ? "connected" : "disconnected"}`}>
          {status.connected ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {status.connected ? "Connected" : "Not Connected"}
        </div>
        {status.lastSyncTime && (
          <span className="sync-last-time">
            <Clock size={13} />
            Last sync: {formatSyncTime(status.lastSyncTime)}
          </span>
        )}
        {status.syncedRecords > 0 && (
          <span className="sync-records">
            <Database size={13} />
            {status.syncedRecords} / {totalRecords} records
          </span>
        )}
      </div>

      {hasError && (
        <div className="sync-error">
          <AlertTriangle size={14} />
          {status.error}
        </div>
      )}

      <div className="settings-actions">
        {onConnect ? (
          <button
            className="button primary"
            onClick={onConnect}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 size={17} className="spin" />
            ) : (
              <Plug size={17} />
            )}
            {isSyncing ? "Connecting..." : `Connect ${name}`}
          </button>
        ) : (
          <button
            className="button primary"
            onClick={onSync}
            disabled={isSyncing || totalRecords === 0}
          >
            {isSyncing ? (
              <Loader2 size={17} className="spin" />
            ) : (
              <RefreshCw size={17} />
            )}
            {isSyncing ? "Syncing..." : "Sync Now"}
          </button>
        )}
        {status.connected && (
          <button
            className="button secondary danger"
            onClick={onDisconnect}
            disabled={isSyncing}
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

function formatSyncTime(isoStr: string): string {
  try {
    const date = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString();
  } catch {
    return isoStr;
  }
}
