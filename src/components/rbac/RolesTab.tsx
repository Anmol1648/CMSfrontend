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

export const RolesTab = () => {
  const { can } = usePermissions();
  const { openModal } = useModal();
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: rbacApi.getRoles,
  });

  const deleteMutation = useMutation({
    mutationFn: rbacApi.deleteRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });

  const handleDelete = (role: any) => {
    openModal("Confirm", {
      title: "Delete Role",
      message: `Are you sure you want to delete "${role.name}"? This will remove all permission and menu assignments.`,
      confirmLabel: "Delete",
      variant: "danger",
      onConfirm: () => deleteMutation.mutate(role.id),
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

  if (roles.length === 0) {
    return (
      <EmptyState
        icon="admin_panel_settings"
        title="No Roles Defined"
        description="Create your first role to start configuring access control."
        actionLabel={can("role", "create") ? "Create Role" : undefined}
        onAction={() => openModal("CreateRole")}
      />
    );
  }

  const columns = [
    {
      header: "Role",
      accessor: (row: any) => (
        <div className="flex items-center gap-3">
          {row.is_system && (
            <Tooltip content="System Role">
              <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
            </Tooltip>
          )}
          <div>
            <p className="font-bold text-primary">{row.name}</p>
            <p className="text-[10px] text-on-surface-variant/60 font-mono">{row.slug}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Description",
      accessor: (row: any) => (
        <span className="text-on-surface-variant text-xs">{row.description || "—"}</span>
      ),
    },
    {
      header: "Scope",
      accessor: (row: any) => (
        <Chip className="text-[10px] uppercase tracking-widest">{row.scope}</Chip>
      ),
    },
    {
      header: "Stats",
      accessor: (row: any) => (
        <div className="flex gap-3 text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
          <span>{row._count?.rolePermissions ?? 0} perms</span>
          <span>{row._count?.roleMenus ?? 0} menus</span>
          <span>{row._count?.userRoles ?? 0} users</span>
        </div>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      accessor: (row: any) => (
        <div className="flex justify-end gap-2">
          {can("role", "update") && (
            <Tooltip content="Manage Role Resources" position="top">
              <button
                onClick={() => openModal("RoleAssignments", { role: row })}
                className="material-symbols-outlined text-lg text-on-surface-variant hover:text-primary transition-colors"
              >
                shield_locked
              </button>
            </Tooltip>
          )}
          {can("role", "update") && (
            <Tooltip content="Edit Role Configuration" position="top">
              <button
                onClick={() => openModal("CreateRole", { editRole: row })}
                className="material-symbols-outlined text-lg text-on-surface-variant hover:text-primary transition-colors"
              >
                edit
              </button>
            </Tooltip>
          )}
          {can("role", "delete") && !row.is_system && (
            <Tooltip content="Delete Role" position="top">
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
          <h2 className="text-lg font-bold text-primary tracking-tight">System Roles</h2>
          <p className="text-xs text-on-surface-variant/60">{roles.length} roles configured</p>
        </div>
        {can("role", "create") && (
          <Button onClick={() => openModal("CreateRole")} className="h-10 px-6 font-bold text-xs flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New Role</span>
          </Button>
        )}
      </div>
      <DataTable columns={columns} data={roles} />
    </div>
  );
};
