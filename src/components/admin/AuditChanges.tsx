import type { AuditEntry } from "@/lib/api/audit";

/** Plain-language names for audit actions and record types. Unknown ones fall back to the raw name. */
export const ACTION_LABELS: Record<string, string> = {
  login: "Signed in",
  login_failed: "Failed sign-in",
  account_locked: "Account locked",
  logout: "Signed out",
  logout_all: "Signed out everywhere",
  password_change: "Changed own password",
  password_reset_requested: "Asked for a password reset",
  password_reset: "Password reset",
  mfa_enabled: "Turned on two-step sign-in",
  mfa_disabled: "Turned off two-step sign-in",
  session_reuse_detected: "Copied sign-in detected (session ended)",
  unlock: "Account unlocked",
  create: "Created",
  update: "Changed",
  delete: "Deleted",
  role_change: "Roles changed",
  permission_change: "Permissions changed",
  setting_change: "Settings changed",
};

export const ENTITY_LABELS: Record<string, string> = {
  user: "User",
  role: "Role",
  school_profile: "School profile",
  settings: "System settings",
  user_session: "Sign-in session",
  email_template: "Email template",
  master_value: "Master list option",
};

export const actionLabel = (a: string) => ACTION_LABELS[a] ?? a.replace(/_/g, " ");
export const entityLabel = (e: string) => ENTITY_LABELS[e] ?? e.replace(/_/g, " ");

const show = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "(empty)";
  if (Array.isArray(v)) return v.length ? v.map(show).join(", ") : "(none)";
  if (typeof v === "boolean") return v ? "on" : "off";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

/** The backend records every field change as [old, new]. */
const isChange = (v: unknown): v is [unknown, unknown] => Array.isArray(v) && v.length === 2;

/** Field changes ([old, new]) as "field: old → new"; other details as "key: value". */
export function AuditChanges({ entry }: { entry: AuditEntry }) {
  const changes = entry.changes ?? {};
  const keys = Object.keys(changes).filter((k) => changes[k] !== undefined);
  if (!keys.length) return <span className="text-on-surface-variant/50">—</span>;
  const listLike = entry.action === "permission_change";
  return (
    <ul className="space-y-1">
      {keys.map((k) => {
        const v = changes[k];
        if (!listLike && isChange(v)) {
          return (
            <li key={k} className="text-xs">
              <span className="font-bold text-on-surface">{k}</span>: <span className="line-through text-on-surface-variant/60">{show(v[0])}</span>{" "}
              <span className="text-on-surface-variant/50">→</span> <span className="font-semibold text-primary">{show(v[1])}</span>
            </li>
          );
        }
        return (
          <li key={k} className="text-xs">
            <span className="font-bold text-on-surface">{k}</span>: {show(v)}
          </li>
        );
      })}
    </ul>
  );
}
