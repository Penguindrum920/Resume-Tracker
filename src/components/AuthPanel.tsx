import { FormEvent } from "react";
import { BriefcaseBusiness, Mail, Send } from "lucide-react";

type AuthMode = "signin" | "signup";

export function AuthPanel({
  authForm,
  authMode,
  busy,
  notice,
  setAuthForm,
  setAuthMode,
  onSubmit,
}: {
  authForm: { fullName: string; email: string; password: string };
  authMode: AuthMode;
  busy: boolean;
  notice: string;
  setAuthForm: React.Dispatch<
    React.SetStateAction<{ fullName: string; email: string; password: string }>
  >;
  setAuthMode: React.Dispatch<React.SetStateAction<AuthMode>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="auth-heading">
          <div className="brand-mark">
            <BriefcaseBusiness size={18} />
            <span>Resume Tracker</span>
          </div>
          <h1>{authMode === "signin" ? "Sign in" : "Create profile"}</h1>
        </div>
        <form className="auth-form" onSubmit={onSubmit}>
          {authMode === "signup" && (
            <label>
              Name
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
            </label>
          )}
          <label>
            Email
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
          <label>
            Password
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
          </label>
          <button className="button primary" disabled={busy} type="submit">
            <Send size={17} />
            {authMode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>
        {notice && <div className="notice">{notice}</div>}
        <button
          className="text-button"
          onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
        >
          {authMode === "signin"
            ? "Need a profile? Create one"
            : "Already have a profile? Sign in"}
        </button>
      </section>
    </main>
  );
}
