"use client";

import { ReportBuilder } from "@/components/reports/ReportBuilder";
import { RequirePermission } from "@/lib/auth/RequirePermission";

export default function NewReportPage() {
  return (
    <RequirePermission permission="report.build">
      <ReportBuilder />
    </RequirePermission>
  );
}
