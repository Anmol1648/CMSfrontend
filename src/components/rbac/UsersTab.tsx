"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rbacApi } from "@/lib/api/endpoints/rbac.endpoints";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useModal } from "@/components/ui/ModalProvider";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Tooltip";

export const UsersTab = () => {
  const { can } = usePermissions();
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users", search],
    queryFn: () => rbacApi.getUsers(search),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: rbacApi.getRoles,
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      rbacApi.assignRoleToUser(userId, roleIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, is_active }: { userId: string; is_active: boolean }) =>
      rbacApi.toggleUserStatus(userId, is_active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const roleOptions = roles.map((r: any) => ({ value: r.id, label: r.name }));

  const columns = [
    {
      header: "User",
      accessor: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm overflow-hidden">
            {row.profile?.avatar_url ? (
              <img src={row.profile.avatar_url} className="w-full h-full object-cover" />
            ) : (
              row.first_name?.[0] || "?"
            )}
          </div>
          <div>
            <p className="font-bold text-primary">{row.first_name} {row.last_name}</p>
            <p className="text-[10px] text-on-surface-variant/60">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Roles",
      accessor: (row: any) => (
        <div className="flex flex-wrap gap-1">
          {row.userRoles?.length > 0 ? (
            row.userRoles.map((ur: any) => (
              <Chip key={ur.role_id} className="text-[10px]">{ur.role.name}</Chip>
            ))
          ) : (
            <span className="text-[10px] text-on-surface-variant/40 italic">No roles</span>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (row: any) => (
        <Chip className={`text-[10px] uppercase tracking-widest ${row.is_active ? "bg-emerald-500/10 text-emerald-600" : "bg-error/10 text-error"}`}>
          {row.is_active ? "Active" : "Inactive"}
        </Chip>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      accessor: (row: any) => (
        <div className="flex justify-end gap-2">
          {can("role", "update") && (
            <Tooltip content="Manage Roles" position="top">
              <button
                onClick={() => setExpandedUserId(expandedUserId === row.id ? null : row.id)}
                className="material-symbols-outlined text-lg text-on-surface-variant hover:text-primary transition-colors"
              >
                manage_accounts
              </button>
            </Tooltip>
          )}
          {can("user", "update") && (
            <Tooltip content={row.is_active ? "Deactivate" : "Activate"} position="top">
              <button
                onClick={() => toggleStatusMutation.mutate({ userId: row.id, is_active: !row.is_active })}
                className={`material-symbols-outlined text-lg transition-colors ${row.is_active ? "text-on-surface-variant hover:text-error" : "text-on-surface-variant hover:text-emerald-600"}`}
              >
                {row.is_active ? "person_off" : "person"}
              </button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search users by name or email..."
            icon="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon="person_search"
          title="No Users Found"
          description={search ? `No results for "${search}". Try a different search term.` : "No users in the system yet."}
        />
      ) : (
        <>
          <DataTable columns={columns} data={users} />

          {/* Expanded role assignment panel */}
          {expandedUserId && (
            <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10 animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant mb-4">
                Assign Roles — {users.find((u: any) => u.id === expandedUserId)?.first_name}
              </p>
              <MultiSelect
                label="Select Roles"
                options={roleOptions}
                defaultValues={
                  users
                    .find((u: any) => u.id === expandedUserId)
                    ?.userRoles?.map((ur: any) => ur.role_id) || []
                }
                onChange={(roleIds) => {
                  assignMutation.mutate({ userId: expandedUserId, roleIds });
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
