import React, { useState } from "react";
import { ModalComponent } from "../ModalProvider";
import { useWidgets } from "@/lib/hooks/useWidgets";
import { useUpsertRoleWidgetMapping } from "@/lib/hooks/useWidgets";
import { RoleWidgetMapping } from "@/types/models/widget.model";

interface AssignWidgetModalProps {
    roleId: string;
    mapping?: RoleWidgetMapping;
}

export const AssignWidgetModal: ModalComponent<AssignWidgetModalProps> = ({ close, roleId, mapping }) => {
    const isEdit = !!mapping;
    const { data: widgetsResponse } = useWidgets();
    const widgets = widgetsResponse || [];
    const { mutateAsync: upsertMapping, isPending } = useUpsertRoleWidgetMapping();

    const [formData, setFormData] = useState({
        widget_id: mapping?.widget_id || "",
        enabled: mapping?.enabled ?? true,
        width: mapping?.width || 1,
        height: mapping?.height || 1,
        display_order: mapping?.display_order || 0,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.widget_id) return;

        try {
            await upsertMapping({
                role_id: roleId,
                ...formData
            });
            close();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1">Select Widget</label>
                    <select
                        required
                        disabled={isEdit} // Cannot change widget once mapped, must delete and recreate
                        value={formData.widget_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, widget_id: e.target.value }))}
                        className="w-full h-12 bg-surface-container-low border-none rounded-xl px-4 font-medium"
                    >
                        <option value="">-- Choose a Widget --</option>
                        {widgets.map(w => (
                            <option key={w.id} value={w.id}>{w.title} ({w.widget_type})</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-on-surface-variant mb-1">Width (Grid Cols)</label>
                        <select
                            value={formData.width}
                            onChange={(e) => setFormData(prev => ({ ...prev, width: Number(e.target.value) }))}
                            className="w-full h-12 bg-surface-container-low border-none rounded-xl px-4 font-medium"
                        >
                            <option value={1}>1 (Quarter)</option>
                            <option value={2}>2 (Half)</option>
                            <option value={3}>3 (Three Quarters)</option>
                            <option value={4}>4 (Full Width)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-on-surface-variant mb-1">Height (Rows)</label>
                        <select
                            value={formData.height}
                            onChange={(e) => setFormData(prev => ({ ...prev, height: Number(e.target.value) }))}
                            className="w-full h-12 bg-surface-container-low border-none rounded-xl px-4 font-medium"
                        >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                        </select>
                    </div>
                </div>

                <label className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant/30 rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors">
                    <input
                        type="checkbox"
                        checked={formData.enabled}
                        onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="w-5 h-5 rounded text-primary focus:ring-primary border-outline-variant/30"
                    />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-on-surface">Enable Widget</span>
                        <span className="text-[10px] text-on-surface-variant">Uncheck to hide without deleting mapping</span>
                    </div>
                </label>
            </div>

            <div className="pt-6 border-t border-outline-variant/20 flex gap-3 justify-end">
                <button
                    type="button"
                    onClick={close}
                    className="h-10 px-6 rounded-xl font-bold text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="h-10 px-6 gradient-primary text-white font-bold text-sm rounded-lg shadow-premium flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">save</span>
                    {isEdit ? "Update Mapping" : "Assign"}
                </button>
            </div>
        </form>
    );
};
