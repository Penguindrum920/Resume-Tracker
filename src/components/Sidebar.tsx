import { FormEvent } from "react";
import {
  BriefcaseBusiness,
  LogOut,
  UserRound,
} from "lucide-react";
import type { ProfileRow } from "../types";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar({
  profile,
  profileForm,
  setProfileForm,
  onSaveProfile,
  onSignOut,
  theme,
  toggleTheme,
  busy,
  email,
}: {
  profile: ProfileRow | null;
  profileForm: { fullName: string; role: string; location: string };
  setProfileForm: React.Dispatch<
    React.SetStateAction<{ fullName: string; role: string; location: string }>
  >;
  onSaveProfile: (e: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  busy: boolean;
  email: string;
}) {
  return (
    <aside className="rail">
      <div>
        <div className="brand-mark">
          <BriefcaseBusiness size={18} />
          <span>Resume Tracker</span>
        </div>

        <form className="profile-panel" onSubmit={onSaveProfile}>
          <div className="avatar" aria-hidden="true">
            {getInitials(profileForm.fullName || email || "RT")}
          </div>
          <label>
            Name
            <input
              value={profileForm.fullName}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  fullName: event.target.value,
                }))
              }
              placeholder="Your name"
            />
          </label>
          <label>
            Target role
            <input
              value={profileForm.role}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  role: event.target.value,
                }))
              }
              placeholder="Frontend Intern"
            />
          </label>
          <label>
            Location
            <input
              value={profileForm.location}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  location: event.target.value,
                }))
              }
              placeholder="Remote / Bengaluru"
            />
          </label>
          <button className="button secondary" type="submit" disabled={busy}>
            <UserRound size={16} />
            Save Profile
          </button>
        </form>
      </div>

      <div className="account-strip">
        <span>{email}</span>
        <div className="account-actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button className="icon-button" onClick={onSignOut} aria-label="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function getInitials(value: string) {
  return value
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
