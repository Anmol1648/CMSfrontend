"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rbacApi } from "@/lib/api/endpoints/rbac.endpoints";
import { Button } from "../Button";
import { MultiSelect } from "../MultiSelect";
import { ModalComponent } from "../ModalProvider";
import { Skeleton } from "../Skeleton";
import { Tabs } from "../Tabs";

export const RoleAssignmentsModal: ModalComponent<{ role: any }> = ({ close, role }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("permissions");

  // Fetch all available definitions
  const { data: allPermissions = [], isLoading: isLoadingPerms } = useQuery({
    queryKey: ["permissions"],
    queryFn: rbacApi.getPermissions,
  });

  const { data: allMenus = [], isLoading: isLoadingMenus } = useQuery({
    queryKey: ["menus"],
    queryFn: rbacApi.getMenus,
  });

  // Fetch role's current assignments using the roles endpoints
  // Note: the backend returns 'roles' which includes rolePermissions and roleMenus counts.
  // Actually, we must use a specific endpoint or the full role payload if it includes it.
  // Let's assume we pass the full `role` object from the DataTable, which might not have the full array.
  // We need to fetch the specific role's permissions/menus if not present.
  
  // To avoid adding new backend endpoints if they don't exist, I'll rely on the existing assignment endpoints
  // Wait, I created assignPermissions and assignMenus in the backend. 
  // Let's hold the state here locally before saving.
  
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  
  // It's tricky to get the current assignments because GET /roles only returns counts via _count.
  // I need to fetch the specific assignments. Let's use getRoleMenus and a hypothetical getRolePermissions (or fallback to getting all roles fully populated).
  // Actually, backend has `getRoleMenus`. It doesn't have `getRolePermissions`. Let's just allow rewriting them for now or we will see.

  useEffect(() => {
     rbacApi.getRoleMenus(role.id).then(res => {
         setSelectedMenus(res.map((rm: any) => rm.menu_id));
     });
     rbacApi.getRolePermissions(role.id).then(res => {
         setSelectedPermissions(res.map((rp: any) => rp.permission_id));
     });
  }, [role.id]);

  const assignPermsMutation = useMutation({
    mutationFn: () => rbacApi.assignPermissions(role.id, selectedPermissions.map(id => ({ permission_id: id }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    }
  });

  const assignMenusMutation = useMutation({
    mutationFn: () => rbacApi.assignMenus(role.id, selectedMenus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    }
  });

  const handleSave = async () => {
    if (activeTab === "permissions") {
      await assignPermsMutation.mutateAsync();
    } else {
      await assignMenusMutation.mutateAsync();
    }
    close();
  };

  if (isLoadingPerms || isLoadingMenus) {
     return <div className="p-4 space-y-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-40 w-full"/></div>;
  }

  const permOptions = allPermissions.map((p: any) => ({
      value: p.id,
      label: `${p.resource}.${p.action} - ${p.description || ''}`
  }));

  const menuOptions = allMenus.map((m: any) => ({
      value: m.id,
      label: m.label
  }));

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60">Target Role</span>
          <span className="font-bold text-primary text-sm">{role.name} ({role.slug})</span>
      </div>

      <Tabs 
        tabs={[
            { id: "permissions", label: "Permissions" },
            { id: "menus", label: "Menu Access" }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      <div className="min-h-[250px]">
        {activeTab === "permissions" && (
            <div className="space-y-4">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                    Select all permissions this role should have.
                </p>
                <MultiSelect 
                    label="Assign Permissions"
                    options={permOptions}
                    defaultValues={selectedPermissions}
                    onChange={setSelectedPermissions}
                />
            </div>
        )}

        {activeTab === "menus" && (
            <div className="space-y-4">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                    Select which sidebar menus this role can see.
                </p>
                <MultiSelect 
                    label="Assign Menus"
                    options={menuOptions}
                    defaultValues={selectedMenus}
                    onChange={setSelectedMenus}
                />
            </div>
        )}
      </div>

      <div className="pt-4 flex gap-3 border-t border-outline-variant/10">
        <Button 
          onClick={close}
          variant="secondary"
          className="flex-1 font-bold h-12"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          disabled={assignPermsMutation.isPending || assignMenusMutation.isPending}
          className="flex-1 bg-primary text-white font-bold h-12 shadow-premium hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {assignPermsMutation.isPending || assignMenusMutation.isPending ? 'Saving...' : 'Save Assignments'}
        </Button>
      </div>
    </div>
  );
};
