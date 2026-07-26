import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BriefcaseBusiness } from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { useTheme } from "./hooks/useTheme";
import { useToast } from "./hooks/useToast";
import { useApplications } from "./hooks/useApplications";
import type { ApplicationRow } from "./types";
import { AuthPanel } from "./components/AuthPanel";
import { Sidebar } from "./components/Sidebar";
import { StatsGrid } from "./components/StatsGrid";
import { ApplicationForm } from "./components/ApplicationForm";
import { ApplicationCard } from "./components/ApplicationCard";
import { ApplicationDetail } from "./components/ApplicationDetail";
import { FilterBar } from "./components/FilterBar";
import { DeadlineReminders } from "./components/DeadlineReminders";
import { RecentActivity } from "./components/RecentActivity";
import { QuickAddSection } from "./components/QuickAddPage";
import { ToastContainer } from "./components/ToastContainer";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { SkeletonCards } from "./components/Skeleton";
import { EmptyState } from "./components/EmptyState";
import type { ApplicationFormState } from "./lib/validation";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authForm, setAuthForm] = useState({ fullName: "", email: "", password: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingApp, setEditingApp] = useState<ApplicationRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApplicationRow | null>(null);

  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const apps = useApplications(session);

  const [profile, setProfile] = useState<import("./types").ProfileRow | null>(null);
  const [profileForm, setProfileForm] = useState({ fullName: "", role: "", location: "" });

  const selectedApplication =
    apps.applications.find((a) => a.id === selectedId) ?? apps.filtered[0] ?? null;

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || profile !== null || !supabase) return;

    let cancelled = false;

    (async () => {
      const [profileResult, applicationResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
        supabase
          .from("applications")
          .select("*")
          .eq("user_id", session.user.id)
          .order("applied_on", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (profileResult.data) {
        setProfile(profileResult.data);
        setProfileForm({
          fullName: profileResult.data.full_name,
          role: profileResult.data.role ?? "",
          location: profileResult.data.location ?? "",
        });
      }
      if (applicationResult.data) {
        void apps.loadApplications(session.user);
      }
    })();

    return () => { cancelled = true; };
  }, [session?.user?.id, profile]);

  if (!isSupabaseConfigured) {
    return <SetupMissing />;
  }

  if (authLoading) {
    return (
      <main className="loading-screen">
        <div className="stamp">Resume Tracker</div>
      </main>
    );
  }

  if (!session) {
    return (
      <AuthPanel
        authForm={authForm}
        authMode={authMode}
        busy={apps.busy}
        notice=""
        setAuthForm={setAuthForm}
        setAuthMode={setAuthMode}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!supabase) return;
          const creds = { email: authForm.email.trim(), password: authForm.password };
          const result =
            authMode === "signin"
              ? await supabase.auth.signInWithPassword(creds)
              : await supabase.auth.signUp({
                  ...creds,
                  options: { data: { full_name: authForm.fullName.trim() } },
                });
          if (result.error) {
            toast.error(result.error.message);
            return;
          }
          if (authMode === "signup" && result.data.user) {
            await supabase.from("profiles").upsert({
              id: result.data.user.id,
              full_name: authForm.fullName.trim() || authForm.email.trim().split("@")[0],
            });
          }
          if (!result.data.session && authMode === "signup") {
            toast.info("Check your email to confirm, then sign in.");
          }
        }}
      />
    );
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !session) return;
    const fullName = profileForm.fullName.trim() || session.user.email?.split("@")[0] || "User";
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: session.user.id,
        full_name: fullName,
        role: profileForm.role.trim() || null,
        location: profileForm.location.trim() || null,
      })
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
    } else {
      setProfile(data);
      setProfileForm({
        fullName: data.full_name,
        role: data.role ?? "",
        location: data.location ?? "",
      });
      toast.success("Profile saved.");
    }
  }

  function handleNavigateToApp(appId: string) {
    setSelectedId(appId);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const result = await apps.deleteApplication(deleteTarget);
    setDeleteTarget(null);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(`${deleteTarget.company} deleted.`);
      setSelectedId(null);
    }
  }

  async function handleCreateApplication(
    form: ApplicationFormState,
    files: { screenshot?: File | null; resume?: File | null },
  ) {
    const result = await apps.createApplication(form, files);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Application logged.");
      setShowForm(false);
      if (result.data) setSelectedId(result.data.id);
    }
    return result;
  }

  async function handleUpdateApplication(
    form: ApplicationFormState,
    _files: { screenshot?: File | null; resume?: File | null },
  ) {
    if (!editingApp) return { error: "No application selected" };
    const result = await apps.updateApplication(editingApp.id, form);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Application updated.");
      setEditingApp(null);
    }
    return result;
  }

  async function handleDeleteFromDetail(application: ApplicationRow) {
    setDeleteTarget(application);
  }

  return (
    <main className="app-shell">
      <Sidebar
        profile={profile}
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        onSaveProfile={handleSaveProfile}
        onSignOut={async () => {
          if (supabase) await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
        }}
        theme={theme}
        toggleTheme={toggleTheme}
        busy={apps.busy}
        email={session.user.email ?? ""}
      />

      <DashboardView
        apps={apps}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        selectedApplication={selectedApplication}
        editingApp={editingApp}
        setEditingApp={setEditingApp}
        showForm={showForm}
        setShowForm={setShowForm}
        showQuickAdd={showQuickAdd}
        setShowQuickAdd={setShowQuickAdd}
        onCreateApplication={handleCreateApplication}
        onUpdateApplication={handleUpdateApplication}
        onDeleteFromDetail={handleDeleteFromDetail}
        navigateToApp={handleNavigateToApp}
      />

      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete ${deleteTarget.company}? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </main>
  );
}

function DashboardView({
  apps,
  selectedId,
  setSelectedId,
  selectedApplication,
  editingApp,
  setEditingApp,
  showForm,
  setShowForm,
  showQuickAdd,
  setShowQuickAdd,
  onCreateApplication,
  onUpdateApplication,
  onDeleteFromDetail,
  navigateToApp,
}: {
  apps: ReturnType<typeof useApplications>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedApplication: ApplicationRow | null;
  editingApp: ApplicationRow | null;
  setEditingApp: (app: ApplicationRow | null) => void;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  showQuickAdd: boolean;
  setShowQuickAdd: (show: boolean) => void;
  onCreateApplication: (
    form: ApplicationFormState,
    files: { screenshot?: File | null; resume?: File | null },
  ) => Promise<{ error: string | null }>;
  onUpdateApplication: (
    form: ApplicationFormState,
    files: { screenshot?: File | null; resume?: File | null },
  ) => Promise<{ error: string | null }>;
  onDeleteFromDetail: (app: ApplicationRow) => void;
  navigateToApp: (id: string) => void;
}) {
  return (
    <section className="workspace">
      <header className="topbar">
        <div>
          <p className="eyebrow">Application desk</p>
          <h1>Your tracker</h1>
        </div>
        <div className="search-box">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            value={apps.query}
            onChange={(e) => apps.setQuery(e.target.value)}
            placeholder="Search companies, roles, packages, notes..."
          />
        </div>
      </header>

      <StatsGrid stats={apps.stats} />

      <div className="quick-actions">
        <button
          className={`action-btn ${showForm ? "active" : ""}`}
          onClick={() => {
            setShowForm(!showForm);
            setEditingApp(null);
            setShowQuickAdd(false);
          }}
        >
          + New Application
        </button>
        <button
          className={`action-btn ${showQuickAdd ? "active" : ""}`}
          onClick={() => {
            setShowQuickAdd(!showQuickAdd);
            setShowForm(false);
            setEditingApp(null);
          }}
        >
          Quick Add
        </button>
      </div>

      {showForm && !editingApp && (
        <section className="panel-card form-section">
          <h2 className="panel-title">New Application</h2>
          <ApplicationForm
            onSubmit={onCreateApplication}
            onCancel={() => setShowForm(false)}
            busy={apps.busy}
          />
        </section>
      )}

      {showQuickAdd && (
        <QuickAddSection
          onCreateApplication={onCreateApplication}
          busy={apps.busy}
          onClose={() => setShowQuickAdd(false)}
        />
      )}

      {editingApp && (
        <section className="panel-card form-section">
          <h2 className="panel-title">Edit Application</h2>
          <ApplicationForm
            editingApplication={editingApp}
            onSubmit={onUpdateApplication}
            onCancel={() => setEditingApp(null)}
            busy={apps.busy}
          />
        </section>
      )}

      <DeadlineReminders reminders={apps.reminders} onNavigate={navigateToApp} />

      <RecentActivity applications={apps.applications} onNavigate={navigateToApp} />

      <section className="board-grid">
        <div className="list-panel">
          <FilterBar
            filters={apps.filters}
            setFilters={apps.setFilters}
            sort={apps.sort}
            setSort={apps.setSort}
            resultCount={apps.filtered.length}
          />

          {apps.loading ? (
            <SkeletonCards count={4} />
          ) : apps.filtered.length === 0 ? (
            <EmptyState
              title="No matching applications"
              description="Try adjusting your search or filters"
            />
          ) : (
            <div className="application-list">
              {apps.filtered.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  isSelected={selectedApplication?.id === application.id}
                  onSelect={() => setSelectedId(application.id)}
                  onDelete={() => onDeleteFromDetail(application)}
                  onOpenFile={apps.openSignedFile}
                />
              ))}
            </div>
          )}
        </div>

        <ApplicationDetail
          application={selectedApplication}
          busy={apps.busy}
          onDelete={onDeleteFromDetail}
          onOpenFile={apps.openSignedFile}
          onStatusChange={apps.updateStatus}
          onEdit={(app) => {
            setEditingApp(app);
            setShowForm(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </section>
    </section>
  );
}

function SetupMissing() {
  return (
    <main className="setup-screen">
      <section className="setup-panel">
        <div className="brand-mark">
          <BriefcaseBusiness size={18} />
          <span>Resume Tracker</span>
        </div>
        <h1>Supabase is not connected</h1>
        <pre>{`VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...`}</pre>
      </section>
    </main>
  );
}

export default App;
