import React, { useState, useEffect } from "react";
import { ModalComponent } from "../ModalProvider";
import { useCreateWidget, useUpdateWidget, usePreviewWidgetQuery } from "@/lib/hooks/useWidgets";
import { Widget } from "@/types/models/widget.model";

interface WidgetEditorModalProps {
    widget?: Widget;
}

export const WidgetEditorModal: ModalComponent<WidgetEditorModalProps> = ({ close, widget }) => {
    const isEdit = !!widget;
    const { mutateAsync: createWidget } = useCreateWidget();
    const { mutateAsync: updateWidget } = useUpdateWidget();
    const { mutateAsync: previewQuery, isPending: isPreviewing } = usePreviewWidgetQuery();

    const [formData, setFormData] = useState({
        title: "",
        display_name: "",
        widget_type: "stat",
        sub_type: "stat_card",
        query: "",
        config: "{}",
    });
    
    const [previewResult, setPreviewResult] = useState<any>(null);

    useEffect(() => {
        if (widget) {
            setFormData({
                title: widget.title,
                display_name: widget.display_name || "",
                widget_type: widget.widget_type,
                sub_type: widget.sub_type || "",
                query: widget.query,
                config: typeof widget.config === 'object' ? JSON.stringify(widget.config, null, 2) : "{}",
            });
        }
    }, [widget]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let parsedConfig = {};
            try {
                parsedConfig = JSON.parse(formData.config);
            } catch (err) {
                alert("Invalid JSON in config");
                return;
            }

            const payload = {
                ...formData,
                config: parsedConfig,
            };

            if (isEdit) {
                await updateWidget({ id: widget!.id, data: payload as any });
            } else {
                await createWidget(payload as any);
            }
            close();
        } catch (error) {
            console.error(error);
        }
    };

    const handlePreview = async () => {
        if (!formData.query) return;
        try {
            const res: any = await previewQuery({ query: formData.query });
            setPreviewResult(res.data);
        } catch (error: any) {
            setPreviewResult({ error: error.message || "Query failed" });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-6">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-on-surface-variant mb-1">Title</label>
                        <input
                            required
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full h-10 bg-surface-container-low border-none rounded-xl px-4 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-on-surface-variant mb-1">Display Name</label>
                        <input
                            type="text"
                            value={formData.display_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                            className="w-full h-10 bg-surface-container-low border-none rounded-xl px-4 text-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-on-surface-variant mb-1">Type</label>
                        <select
                            value={formData.widget_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, widget_type: e.target.value }))}
                            className="w-full h-10 bg-surface-container-low border-none rounded-xl px-4 text-sm"
                        >
                            <option value="stat">Stat Card</option>
                            <option value="chart">Chart</option>
                            <option value="table">Table</option>
                            <option value="feed">Feed</option>
                            <option value="calendar">Calendar</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-on-surface-variant mb-1">Sub Type</label>
                        <input
                            type="text"
                            value={formData.sub_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, sub_type: e.target.value }))}
                            className="w-full h-10 bg-surface-container-low border-none rounded-xl px-4 text-sm"
                            placeholder="e.g. bar, pie, user_list"
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-end mb-1">
                        <label className="block text-xs font-bold text-on-surface-variant">SQL Query</label>
                        <button type="button" onClick={handlePreview} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">play_arrow</span> Preview
                        </button>
                    </div>
                    <textarea
                        required
                        rows={4}
                        value={formData.query}
                        onChange={(e) => setFormData(prev => ({ ...prev, query: e.target.value }))}
                        className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm font-mono text-primary"
                        placeholder="SELECT COUNT(*) FROM users"
                    />
                </div>

                {previewResult && (
                    <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 text-xs overflow-auto max-h-48 font-mono">
                        {previewResult.error ? (
                            <span className="text-error font-bold">{previewResult.error}</span>
                        ) : (
                            <pre className="text-on-surface-variant">
                                {JSON.stringify(previewResult.rows?.slice(0, 5), null, 2)}
                                {previewResult.rows?.length > 5 ? '\n... (truncated)' : ''}
                            </pre>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-on-surface-variant mb-1">Config (JSON)</label>
                    <textarea
                        rows={3}
                        value={formData.config}
                        onChange={(e) => setFormData(prev => ({ ...prev, config: e.target.value }))}
                        className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm font-mono"
                    />
                </div>
            </div>

            <div className="pt-6 border-t border-outline-variant/20 flex gap-3 justify-end mt-auto">
                <button
                    type="button"
                    onClick={close}
                    className="h-10 px-6 rounded-xl font-bold text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="h-10 px-6 gradient-primary text-white font-bold text-sm rounded-lg shadow-premium flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">save</span>
                    {isEdit ? "Update Widget" : "Create Widget"}
                </button>
            </div>
        </form>
    );
};
