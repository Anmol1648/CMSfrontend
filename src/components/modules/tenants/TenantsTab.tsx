"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi } from "@/lib/api/endpoints/tenant.endpoints";
import { useModal } from "@/components/ui/ModalProvider";
import { useDrawer } from "@/components/ui/DrawerProvider";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Tooltip";

const STATUS_MAP: Record<string, { label: string; variant: "success" | "error" | "warning" }> = {
  active: { label: "Active", variant: "success" },
  suspended: { label: "Suspended", variant: "error" },
  provisioning: { label: "Provisioning", variant: "warning" },
};

export const TenantsTab = () => {
  const { openModal } = useModal();
  const { openDrawer } = useDrawer();
  const queryClient = useQueryClient();

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: tenantApi.getAll,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "suspended" }) =>
      tenantApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenants"] }),
  });

  const migrateMutation = useMutation({
    mutationFn: (id: string) => tenantApi.triggerMigration(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenants"] }),
  });

  const handleToggleStatus = (tenant: any) => {
    const newStatus = tenant.status === "active" ? "suspended" : "active";
    const action = newStatus === "suspended" ? "Suspend" : "Activate";

    openModal("Confirm", {
      title: `${action} Tenant`,
      message: `Are you sure you want to ${action.toLowerCase()} "${tenant.name}"? ${
        newStatus === "suspended"
          ? "This will evict the tenant from the connection pool and block all access."
          : "This will re-enable access for all tenant users."
      }`,
      confirmLabel: action,
      variant: newStatus === "suspended" ? "danger" : "primary",
      onConfirm: () => statusMutation.mutate({ id: tenant.id, status: newStatus }),
    });
  };

  const handleMigrate = (tenant: any) => {
    openModal("Confirm", {
      title: "Run Migrations",
      message: `Trigger a migration run for "${tenant.name}"? This will apply any pending schema changes to the tenant database.`,
      confirmLabel: "Run Migrations",
      variant: "primary",
      onConfirm: () => migrateMutation.mutate(tenant.id),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <EmptyState
        icon="domain_add"
        title="No Tenants Onboarded"
        description="Onboard your first college to begin provisioning isolated databases and configurations."
        actionLabel="Onboard Tenant"
        onAction={() => openModal("OnboardTenant")}
      />
    );
  }

  const columns = [
    {
      header: "Tenant",
      accessor: (row: any) => (
        <div>
          <p className="font-bold text-primary">{row.name}</p>
          <p className="text-[10px] text-on-surface-variant/60 font-mono">{row.slug}</p>
        </div>
      ),
    },
    {
      header: "Domain",
      accessor: (row: any) => (
        <span className="text-xs text-on-surface-variant font-medium">{row.domain}</span>
      ),
    },
    {
      header: "Status",
      accessor: (row: any) => {
        const status = STATUS_MAP[row.status] || { label: row.status, variant: "warning" as const };
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      header: "Database",
      accessor: (row: any) => (
        <span className="text-[10px] text-on-surface-variant/60 font-mono tracking-tight">
          {row.db_name || "—"}
        </span>
      ),
    },
    {
      header: "Created",
      accessor: (row: any) => (
        <span className="text-xs text-on-surface-variant/60">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }) : "—"}
        </span>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      accessor: (row: any) => (
        <div className="flex justify-end gap-2">
          <Tooltip content="View Details" position="top">
            <button
              onClick={() => openDrawer("TenantDetail", { tenantId: row.id })}
              className="material-symbols-outlined text-lg text-on-surface-variant hover:text-primary transition-colors"
            >
              visibility
            </button>
          </Tooltip>

          {row.status === "active" && (
            <Tooltip content="Run Migrations" position="top">
              <button
                onClick={() => handleMigrate(row)}
                className="material-symbols-outlined text-lg text-on-surface-variant hover:text-primary transition-colors"
              >
                database
              </button>
            </Tooltip>
          )}

          <Tooltip content={row.status === "active" ? "Suspend Tenant" : "Activate Tenant"} position="top">
            <button
              onClick={() => handleToggleStatus(row)}
              disabled={row.status === "provisioning"}
              className={`material-symbols-outlined text-lg transition-colors ${
                row.status === "provisioning"
                  ? "text-on-surface-variant/20 cursor-not-allowed"
                  : row.status === "active"
                  ? "text-on-surface-variant hover:text-error"
                  : "text-on-surface-variant hover:text-emerald-600"
              }`}
            >
              {row.status === "active" ? "block" : "check_circle"}
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary tracking-tight">Registered Tenants</h2>
          <p className="text-xs text-on-surface-variant/60">{tenants.length} tenants onboarded</p>
        </div>
        <Button
          onClick={() => openModal("OnboardTenant")}
          className="h-10 px-6 font-bold text-xs flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Onboard Tenant</span>
        </Button>
      </div>
      <DataTable columns={columns} data={tenants} />
    </div>
  );
};
