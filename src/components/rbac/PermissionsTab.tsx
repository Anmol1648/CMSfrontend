"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rbacApi } from "@/lib/api/endpoints/rbac.endpoints";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useModal } from "@/components/ui/ModalProvider";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Tooltip";

export const PermissionsTab = () => {
  const { can } = usePermissions();
  const { openModal } = useModal();
  const queryClient = useQueryClient();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: rbacApi.getPermissions,
  });

  const deleteMutation = useMutation({
    mutationFn: rbacApi.deletePermission,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["permissions"] }),
  });

  const handleDelete = (perm: any) => {
    openModal("Confirm", {
      title: "Delete Permission",
      message: `Delete "${perm.resource}.${perm.action}"? Any roles using this permission will lose access.`,
      confirmLabel: "Delete",
      variant: "danger",
      onConfirm: () => deleteMutation.mutate(perm.id),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (permissions.length === 0) {
    return (
      <EmptyState
        icon="shield"
        title="No Permissions Defined"
        description="Define permission resources and actions to build your security matrix."
        actionLabel={can("role", "create") ? "Add Permission" : undefined}
        onAction={() => openModal("CreatePermission")}
      />
    );
  }

  // Group by resource for visual clarity
  const resources = Array.from(new Set<string>(permissions.map((p: any) => p.resource)));

  const columns = [
    {
      header: "Resource",
      accessor: (row: any) => (
        <span className="font-bold text-primary">{row.resource}</span>
      ),
    },
    {
      header: "Action",
      accessor: (row: any) => (
        <Chip className="text-[10px] uppercase tracking-widest">{row.action}</Chip>
      ),
    },
    {
      header: "Key",
      accessor: (row: any) => (
        <span className="font-mono text-xs text-on-surface-variant/60">{row.resource}.{row.action}</span>
      ),
    },
    {
      header: "Description",
      accessor: (row: any) => (
        <span className="text-xs text-on-surface-variant">{row.description || "—"}</span>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      accessor: (row: any) => (
        <div className="flex justify-end gap-2">
          {can("role", "update") && (
            <Tooltip content="Edit Permission" position="top">
              <button
                onClick={() => openModal("CreatePermission", { editPermission: row })}
                className="material-symbols-outlined text-lg text-on-surface-variant hover:text-primary transition-colors"
              >
                edit
              </button>
            </Tooltip>
          )}
          {can("role", "delete") && (
            <Tooltip content="Delete Permission" position="top">
              <button
                onClick={() => handleDelete(row)}
                className="material-symbols-outlined text-lg text-on-surface-variant hover:text-error transition-colors"
              >
                delete
              </button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary tracking-tight">Permission Definitions</h2>
          <p className="text-xs text-on-surface-variant/60">{permissions.length} permissions across {resources.length} resources</p>
        </div>
        {can("role", "create") && (
          <Button onClick={() => openModal("CreatePermission")} className="h-10 px-6 font-bold text-xs flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Permission</span>
          </Button>
        )}
      </div>
      <DataTable columns={columns} data={permissions} />
    </div>
  );
};
