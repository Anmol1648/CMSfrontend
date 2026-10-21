"use client";

import { useParams } from "next/navigation";
import { ReportBuilder } from "@/components/reports/ReportBuilder";
import { RequirePermission } from "@/lib/auth/RequirePermission";

export default function EditReportPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequirePermission permission="report.build">
      <ReportBuilder id={id} />
    </RequirePermission>
  );
}
