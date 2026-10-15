import type { UserKind } from "@/lib/api/auth";
import type { DataScope } from "@/lib/api/admin";

export const KIND_LABELS: Record<UserKind, string> = {
  admin: "Administrator",
  staff: "Staff",
  student: "Student",
  guardian: "Parent / guardian",
};

export const SCOPE_LABELS: Record<DataScope, string> = {
  all: "Everything",
  assigned: "Assigned classes",
  own: "Own records",
};

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
