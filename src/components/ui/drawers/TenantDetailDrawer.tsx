"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi } from "@/lib/api/endpoints/tenant.endpoints";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useModal } from "@/components/ui/ModalProvider";
import { DrawerComponent } from "../DrawerProvider";

const STATUS_MAP: Record<string, { label: string; variant: "success" | "error" | "warning" }> = {
  active: { label: "Active", variant: "success" },
  suspended: { label: "Suspended", variant: "error" },
  provisioning: { label: "Provisioning", variant: "warning" },
};

const InfoRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex justify-between items-center py-3 border-b border-outline-variant/10 last:border-0">
    <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">{label}</span>
    <span className={`text-sm font-bold text-primary ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</span>
  </div>
);

export const TenantDetailDrawer: DrawerComponent<{ tenantId: string }> = ({ tenantId, close }) => {
  const { openModal } = useModal();
  const queryClient = useQueryClient();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-detail", tenantId],
    queryFn: () => tenantApi.getById(tenantId),
    enabled: !!tenantId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "suspended" }) =>
      tenantApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-detail", tenantId] });
    },
  });

  const migrateMutation = useMutation({
    mutationFn: (id: string) => tenantApi.triggerMigration(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-4">error_outline</span>
        <p className="text-sm text-on-surface-variant/60 font-medium">Tenant not found.</p>
      </div>
    );
  }

  const status = STATUS_MAP[tenant.status] || { label: tenant.status, variant: "warning" as const };

  const handleToggleStatus = () => {
    const newStatus = tenant.status === "active" ? "suspended" : "active";
    const action = newStatus === "suspended" ? "Suspend" : "Activate";
    openModal("Confirm", {
      title: `${action} Tenant`,
      message: `${action} "${tenant.name}"?`,
      confirmLabel: action,
      variant: newStatus === "suspended" ? "danger" : "primary",
      onConfirm: () => statusMutation.mutate({ id: tenant.id, status: newStatus }),
    });
  };

  const handleMigrate = () => {
    openModal("Confirm", {
      title: "Run Migrations",
      message: `Trigger migrations for "${tenant.name}"?`,
      confirmLabel: "Run",
      variant: "primary",
      onConfirm: () => migrateMutation.mutate(tenant.id),
    });
  };

  return (
    <div className="space-y-8">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tight">{tenant.name}</h2>
          <p className="text-xs text-on-surface-variant/60 font-mono mt-1">{tenant.slug}</p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      {/* ─── Health Indicator ────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low">
        <div className={`w-3 h-3 rounded-full ${
          tenant.isHealthy
            ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
            : "bg-error shadow-[0_0_12px_rgba(220,38,38,0.3)]"
        }`} />
        <div>
          <p className="text-xs font-bold text-primary">
            {tenant.isHealthy ? "Database Healthy" : "Database Unreachable"}
          </p>
          <p className="text-[10px] text-on-surface-variant/60">
            {tenant.isHealthy ? "Connection pool active, queries executing normally." : "Connection failed — check database credentials and network."}
          </p>
        </div>
      </div>

      {/* ─── Details ─────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl p-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-4">
          Tenant Details
        </h3>
        <InfoRow label="Domain" value={tenant.domain} />
        <InfoRow label="Database Host" value={tenant.db_host} mono />
        <InfoRow label="Database Name" value={tenant.db_name} mono />
        <InfoRow label="Created" value={tenant.createdAt ? new Date(tenant.createdAt).toLocaleString() : "—"} />
        <InfoRow label="Last Updated" value={tenant.updatedAt ? new Date(tenant.updatedAt).toLocaleString() : "—"} />
      </div>

      {/* ─── Actions ─────────────────────────────────────────────── */}
      <div className="space-y-3 pt-4">
        {tenant.status === "active" && (
          <Button
            onClick={handleMigrate}
            variant="secondary"
            className="w-full h-12 font-bold flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">database</span>
            Run Migrations
          </Button>
        )}
        {tenant.status !== "provisioning" && (
          <Button
            onClick={handleToggleStatus}
            className={`w-full h-12 font-bold text-white flex items-center justify-center gap-2 shadow-premium ${
              tenant.status === "active" ? "bg-error hover:bg-error/90" : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {tenant.status === "active" ? "block" : "check_circle"}
            </span>
            {tenant.status === "active" ? "Suspend Tenant" : "Activate Tenant"}
          </Button>
        )}
      </div>
    </div>
  );
};
