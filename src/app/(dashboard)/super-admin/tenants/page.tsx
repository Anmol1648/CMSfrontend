"use client";

import React from "react";
import { TenantsTab } from "@/components/modules/tenants/TenantsTab";

export default function TenantManagementPage() {
  return (
    <div className="max-w-7xl mx-auto pb-20 fade-in flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-display-md text-primary tracking-tight mb-2">Tenant Management</h1>
        <p className="text-on-surface-variant text-lg">
          Onboard, monitor, and manage multi-tenant college instances.
        </p>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        <TenantsTab />
      </div>
    </div>
  );
}
