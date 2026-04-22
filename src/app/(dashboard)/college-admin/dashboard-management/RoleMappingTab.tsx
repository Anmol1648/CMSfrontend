"use client";

import React, { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import apiClient from "@/lib/api/clients/apiClient";
import { useModal } from "@/components/ui/ModalProvider";
import { RoleWidgetMapping } from "@/types/models/widget.model";

// Temporary hook for fetching roles - should be from RBAC endpoints
const useRoles = () => {
    return useQuery({
        queryKey: ['roles'],
        queryFn: () => apiClient.get('/rbac/roles').then(res => res.data.data),
    });
};

export const RoleMappingTab = () => {
    const { data: roles } = useRoles();
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");

    // Create an override hook mapping since we declared hook centrally but file paths differ slightly.
    // For simplicity inline here:
    const { data: response, isPending } = useQuery({
        queryKey: ['roleWidgetMappings', selectedRoleId],
        queryFn: () => apiClient.get(`/role-widget-mappings/role/${selectedRoleId}`).then(res => res.data.data),
        enabled: !!selectedRoleId,
    });
    const mappings: RoleWidgetMapping[] = response || [];

    const { openModal } = useModal();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant/20">
                <div className="w-96">
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                        Select Role
                    </label>
                    <div className="relative">
                        <select
                            value={selectedRoleId}
                            onChange={(e) => setSelectedRoleId(e.target.value)}
                            className="w-full h-12 bg-surface-container-low border-none rounded-xl px-4 appearance-none focus:ring-2 focus:ring-primary font-medium"
                        >
                            <option value="">-- Choose a Role --</option>
                            {roles?.map((r: any) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                            expand_more
                        </span>
                    </div>
                </div>

                <button
                    onClick={() => {
                        if (!selectedRoleId) return;
                        openModal("AssignWidget", { roleId: selectedRoleId });
                    }}
                    disabled={!selectedRoleId}
                    className="h-10 px-6 bg-primary text-white font-bold text-sm rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-sm">add_link</span>
                    Assign Widget
                </button>
            </div>

            {selectedRoleId && (
                <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden min-h-[300px]">
                    {isPending ? (
                        <div className="h-[300px] bg-surface-container-low animate-pulse"></div>
                    ) : mappings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-on-surface-variant">
                            <span className="material-symbols-outlined text-4xl mb-4 opacity-50">link_off</span>
                            <p>No widgets mapped to this role.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-outline-variant/10">
                            {mappings.map((m) => (
                                <div key={m.id} className="flex items-center justify-between p-4 hover:bg-surface-container-lowest transition-colors">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-primary">{m.widget?.title}</span>
                                        <span className="text-xs text-on-surface-variant">Type: {m.widget?.widget_type} | Width: {m.width} | Height: {m.height}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            className="text-primary hover:bg-surface-container p-2 rounded-lg"
                                            onClick={() => openModal("AssignWidget", { roleId: selectedRoleId, mapping: m })}
                                        >
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
