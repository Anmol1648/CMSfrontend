"use client";

import React from "react";
import { useWidgets, useDeleteWidget } from "@/lib/hooks/useWidgets";
import { DataTable, Column } from "@/components/ui/DataTable";
import { useModal } from "@/components/ui/ModalProvider";
import { Widget } from "@/types/models/widget.model";

export const WidgetEditorTab = () => {
    const { data: response, isPending } = useWidgets();
    const { mutate: deleteWidget } = useDeleteWidget();
    const { openModal } = useModal();
    const widgets = response || [];

    const handleCreate = () => {
        openModal("WidgetEditor"); // We will create this modal
    };

    const handleEdit = (widget: Widget) => {
        openModal("WidgetEditor", { widget });
    };

    const columns: Column<Widget>[] = [
        { header: "Title", accessor: "title", className: "font-bold" },
        { 
            header: "Type", 
            accessor: (row: Widget) => (
                <span className="uppercase text-[10px] tracking-wider font-extrabold px-2 py-1 bg-surface-container rounded-md">
                    {row.widget_type}
                </span>
            )
        },
        { header: "Sub Type", accessor: "sub_type" },
        { 
            header: "Status", 
            accessor: (row: Widget) => row.is_active ? 
                <span className="text-emerald-600">Active</span> : 
                <span className="text-on-surface-variant">Inactive</span>
        },
        {
            header: "Actions",
            accessor: (row: Widget) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(row)} className="p-2 hover:bg-surface-container rounded-lg text-primary transition-colors">
                        <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                </div>
            ),
        }
    ];

    if (isPending) {
        return <div className="h-[400px] bg-surface-container-low animate-pulse rounded-2xl"></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={handleCreate}
                    className="h-10 px-6 gradient-primary text-white font-bold text-sm rounded-lg shadow-premium flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    New Widget
                </button>
            </div>
            
            <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden">
                <DataTable columns={columns} data={widgets} />
            </div>
        </div>
    );
};
