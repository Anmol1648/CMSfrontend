"use client";

import React, { useState } from "react";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { Tabs } from "@/components/ui/Tabs";
import { RolesTab } from "@/components/rbac/RolesTab";
import { PermissionsTab } from "@/components/rbac/PermissionsTab";
import { MenusTab } from "@/components/rbac/MenusTab";
import { UsersTab } from "@/components/rbac/UsersTab";

export default function RBACDashboard() {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState("roles");

  const availableTabs = [
    { id: "roles", label: "Roles", visible: can("role", "read") },
    { id: "permissions", label: "Permissions", visible: can("permission", "read") },
    { id: "menus", label: "Menus", visible: can("menu", "read") },
    { id: "users", label: "Users", visible: can("user", "read") },
  ].filter(tab => tab.visible);

  if (!can("role", "read")) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="material-symbols-outlined text-[64px] text-error mb-4">block</span>
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-on-surface-variant">You do not have permission to view RBAC settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 fade-in flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-display-md text-primary tracking-tight mb-2">Access Control</h1>
        <p className="text-on-surface-variant text-lg">
          Manage roles, permissions, menus, and user assignments.
        </p>
      </div>

      {/* Tabs */}
      <Tabs tabs={availableTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "roles" && <RolesTab />}
        {activeTab === "permissions" && <PermissionsTab />}
        {activeTab === "menus" && <MenusTab />}
        {activeTab === "users" && <UsersTab />}
      </div>
    </div>
  );
}
