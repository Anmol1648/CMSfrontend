import type { StaffStatus } from "@/lib/api/staff";

export const STAFF_STATUS: Record<StaffStatus, string> = { working: "Working", relieved: "Relieved", retired: "Retired", suspended: "Suspended" };
