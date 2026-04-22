"use client";

import React, { useState } from "react";

// Stub components for tabs
import { WidgetEditorTab } from "./WidgetEditorTab";
import { RoleMappingTab } from "./RoleMappingTab";

export default function DashboardManagementPage() {
    const [activeTab, setActiveTab] = useState<'editor' | 'mapping'>('editor');

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-display-sm text-primary mb-2">Dashboard Management</h2>
                    <p className="text-on-surface-variant text-sm max-w-xl">
                        Create custom widgets using secure SQL queries and seamlessly assign them to different administrative roles.
                    </p>
                </div>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-1 flex gap-2 w-fit">
                <button
                    onClick={() => setActiveTab('editor')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'editor'
                            ? 'bg-surface shadow-sm text-primary'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                >
                    Widget Library
                </button>
                <button
                    onClick={() => setActiveTab('mapping')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'mapping'
                            ? 'bg-surface shadow-sm text-primary'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                >
                    Role Mappings
                </button>
            </div>

            <div className="mt-8">
                {activeTab === 'editor' ? <WidgetEditorTab /> : <RoleMappingTab />}
            </div>
        </div>
    );
}
