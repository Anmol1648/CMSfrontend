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

export const MenusTab = () => {
  const { can } = usePermissions();
  const { openModal } = useModal();
  const queryClient = useQueryClient();

  const { data: menus = [], isLoading } = useQuery({
    queryKey: ["menus"],
    queryFn: rbacApi.getMenus,
  });

  const deleteMutation = useMutation({
    mutationFn: rbacApi.deleteMenu,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menus"] }),
  });

  const handleDelete = (menu: any) => {
    openModal("Confirm", {
      title: "Delete Menu",
      message: `Delete "${menu.label}"? Child menus and role assignments will also be removed.`,
      confirmLabel: "Delete",
      variant: "danger",
      onConfirm: () => deleteMutation.mutate(menu.id),
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

  if (menus.length === 0) {
    return (
      <EmptyState
        icon="account_tree"
        title="No Menus Defined"
        description="Create navigation items that will appear in the sidebar for assigned roles."
        actionLabel={can("role", "create") ? "Add Menu" : undefined}
        onAction={() => openModal("CreateMenu")}
      />
    );
  }

  // Build parent name lookup
  const parentMap = new Map<string, string>(menus.map((m: any) => [m.id, m.label]));

  const columns = [
    {
      header: "Menu",
      accessor: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-lg">{row.icon || "link"}</span>
          </div>
          <div>
            <p className="font-bold text-primary">{row.label}</p>
            <p className="text-[10px] text-on-surface-variant/60 font-mono">{row.route || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Parent",
      accessor: (row: any) => (
        <span className="text-xs text-on-surface-variant">
          {row.parent_id ? parentMap.get(row.parent_id) || "Unknown" : "Root"}
        </span>
      ),
    },
    {
      header: "Order",
      accessor: (row: any) => (
        <span className="text-xs font-mono text-on-surface-variant/60">{row.sort_order}</span>
      ),
    },
    {
      header: "Status",
      accessor: (row: any) => (
        <Chip className={`text-[10px] uppercase tracking-widest ${row.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-error/10 text-error"}`}>
          {row.is_active ? "Active" : "Disabled"}
        </Chip>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      accessor: (row: any) => (
        <div className="flex justify-end gap-2">
          {can("role", "update") && (
            <Tooltip content="Edit Menu" position="top">
              <button
                onClick={() => openModal("CreateMenu", { editMenu: row })}
                className="material-symbols-outlined text-lg text-on-surface-variant hover:text-primary transition-colors"
              >
                edit
              </button>
            </Tooltip>
          )}
          {can("role", "delete") && (
            <Tooltip content="Delete Menu" position="top">
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
          <h2 className="text-lg font-bold text-primary tracking-tight">System Menus</h2>
          <p className="text-xs text-on-surface-variant/60">{menus.length} navigation items</p>
        </div>
        {can("role", "create") && (
          <Button onClick={() => openModal("CreateMenu")} className="h-10 px-6 font-bold text-xs flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Menu</span>
          </Button>
        )}
      </div>
      <DataTable columns={columns} data={menus} />
    </div>
  );
};
