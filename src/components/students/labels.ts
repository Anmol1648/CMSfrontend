import type { StudentStatus } from "@/lib/api/students";

export const STATUS_LABELS: Record<StudentStatus, string> = { active: "Studying", left: "Left (TC)", passed_out: "Passed out", struck_off: "Struck off" };
