import { FormEvent } from "react";
import { BriefcaseBusiness, Lock, Mail, Send, User } from "lucide-react";

type AuthMode = "signin" | "signup" | "reset";

export function AuthPanel({
  authForm,
  authMode,
  busy,
  notice,
  setAuthForm,
  setAuthMode,
  onSubmit,
  onForgotPassword,
}: {
  authForm: { fullName: string; username: string; email: string; password: string };
  authMode: AuthMode;
  busy: boolean;
  notice: string;
  setAuthForm: React.Dispatch<
    React.SetStateAction<{ fullName: string; username: string; email: string; password: string }>
  >;
  setAuthMode: React.Dispatch<React.SetStateAction<AuthMode>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onForgotPassword: () => void;
}) {
  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="auth-heading">
          <div className="brand-mark">
            <BriefcaseBusiness size={18} />
            <span>Resume Tracker</span>
          </div>
          <h1>
            {authMode === "signin"
              ? "Sign in"
              : authMode === "reset"
                ? "Reset password"
                : "Create profile"}
          </h1>
        </div>
        <form className="auth-form" onSubmit={onSubmit}>
          {authMode === "signup" && (
            <label>
              Name
              <span className="input-with-icon">
                <User size={17} />
                <input
                  required
                  value={authForm.fullName}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  placeholder="Your name"
                />
              </span>
            </label>
          )}
          {authMode === "signup" && (
            <label>
              Username
              <span className="input-with-icon">
                <AtSign size={17} />
                <input
                  required
                  value={authForm.username}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      username: event.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""),
                    }))
                  }
                  placeholder="choose a username"
                  minLength={3}
                  maxLength={30}
                />
              </span>
            </label>
          )}
          {authMode !== "reset" && (
            <label>
              {authMode === "signin" ? "Email or Username" : "Email"}
              <span className="input-with-icon">
                <Mail size={17} />
                <input
                  required
                  type={authMode === "signup" ? "email" : "text"}
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder={
                    authMode === "signin"
                      ? "you@example.com or username"
                      : "you@example.com"
                  }
                />
              </span>
            </label>
          )}
          {authMode === "reset" && (
            <label>
              Registered email
              <span className="input-with-icon">
                <Mail size={17} />
                <input
                  required
                  type="email"
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="you@example.com"
                />
              </span>
            </label>
          )}
          {authMode !== "reset" && (
            <label>
              Password
              <span className="input-with-icon">
                <Lock size={17} />
                <input
                  required
                  minLength={6}
                  type="password"
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Minimum 6 characters"
                />
              </span>
            </label>
          )}
          <button className="button primary" disabled={busy} type="submit">
            <Send size={17} />
            {authMode === "signin"
              ? "Sign In"
              : authMode === "reset"
                ? "Send Reset Link"
                : "Create Account"}
          </button>
        </form>
        {notice && <div className="notice">{notice}</div>}
        {authMode === "signin" && (
          <button className="text-button" onClick={onForgotPassword}>
            Forgot password?
          </button>
        )}
        {authMode === "reset" ? (
          <button
            className="text-button"
            onClick={() => setAuthMode("signin")}
          >
            Back to sign in
          </button>
        ) : (
          <button
            className="text-button"
            onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
          >
            {authMode === "signin"
              ? "Need a profile? Create one"
              : "Already have a profile? Sign in"}
          </button>
        )}
      </section>
    </main>
  );
}

function AtSign({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
    </svg>
  );
}
