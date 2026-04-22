"use client";

import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/lib/store/hooks";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { WidgetRenderer } from "@/components/dashboard/WidgetRenderer";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [isMounted, setIsMounted] = useState(false);
  const { data: widgetsResponse, isPending, isError } = useDashboard();
  const dashboardWidgets = widgetsResponse || [];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="space-y-12 pb-12">
      {/* ─── Hero Section ────────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="flex justify-between items-end gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">Live Academic Session</span>
            </div>
            <h2 className="text-display-lg text-primary mb-2">Institutional Overview</h2>
            <p className="text-on-surface-variant text-lg max-w-2xl leading-relaxed">
              Welcome back, <span className="text-primary font-bold">{isMounted ? (user?.email || "Academic Professional") : "Academic Professional"}</span>.
              Here is the latest snapshot of your institution's performance.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Dynamic Widgets Grid ───────────────────────────────────────── */}
      {isPending ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-surface-container-low h-48 rounded-2xl"></div>
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 text-center bg-error-container text-on-error-container rounded-2xl">
          Error loading dashboard widgets. Please try again.
        </div>
      ) : dashboardWidgets.length === 0 ? (
        <div className="p-12 text-center bg-surface-container-low text-on-surface-variant rounded-2xl border border-outline-variant/30 border-dashed">
          <span className="material-symbols-outlined text-4xl mb-4 opacity-50">dashboard</span>
          <h3 className="text-lg font-bold text-on-surface">No Widgets Assigned</h3>
          <p className="mt-2 text-sm opacity-80 max-w-md mx-auto">Your current role has no dashboard widgets assigned. Contact an administrator to map widgets to your role.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[minmax(0,_auto)]">
          {dashboardWidgets.map((widget) => {
            // Map mapping width to Tailwind col-span (1=quarter, 2=half, 3=three-quarters, 4=full)
            const widthClass = {
              1: 'col-span-1',
              2: 'col-span-1 md:col-span-2',
              3: 'col-span-1 md:col-span-2 lg:col-span-3',
              4: 'col-span-1 md:col-span-2 lg:col-span-4'
            }[widget.mapping?.width || 1] || 'col-span-1';

            // Map mapping height roughly to min-height multiples if desired, but we can rely on content
            // Chart widgets typically need 300px min-height, stats use ~200px.
            const minHeight = (widget.mapping?.height || 1) > 1 ? `${(widget.mapping?.height || 1) * 200 + ((widget.mapping?.height || 1) - 1) * 24}px` : undefined;

            return (
              <div
                key={widget.mapping?.id || widget.id}
                className={cn(widthClass, "h-full min-h-[200px]")}
                style={{ minHeight: minHeight }}
              >
                <WidgetRenderer widget={widget} />
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
