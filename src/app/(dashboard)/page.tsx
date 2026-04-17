"use client";

import React, { useState, useEffect } from "react";
import { InstitutionalOverview } from "@/components/dashboard/InstitutionalOverview";
import { StatCard } from "@/components/dashboard/StatCard";
import { useAppSelector } from "@/lib/store/hooks";

export default function DashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="space-y-12">
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
          
          <div className="flex gap-4 mb-2">
            <button className="h-10 px-8 bg-surface-container-high hover:bg-surface-variant text-primary font-bold text-sm rounded-lg transition-colors">
              Download Audit
            </button>
            <button className="h-10 px-8 gradient-primary text-white font-bold text-sm rounded-lg shadow-premium">
              Generate Report
            </button>
          </div>
        </div>
      </section>

      {/* ─── Stats Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Enrollment"
          value="14,284"
          trend={{ value: "+12%", type: "up" }}
          icon="groups"
        />
        <StatCard
          label="Faculty Strength"
          value="842"
          trend={{ value: "8 new", type: "neutral" }}
          icon="school"
        />
        <StatCard
          label="Revenue (Current Term)"
          value="$2.4M"
          trend={{ value: "+4.2%", type: "up" }}
          icon="payments"
        />
        <StatCard
          label="Research Grants"
          value="156"
          trend={{ value: "12 pending", type: "neutral" }}
          icon="science"
        />
      </div>

      {/* ─── Recent Activity / Secondary Sections ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
        <div className="lg:col-span-2 bg-surface-lowest p-8 rounded-[2rem] border border-surface-variant/20 shadow-premium">
          <h3 className="text-xl font-bold text-primary mb-6">Recent Academic Events</h3>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-6 items-start pb-6 border-b border-surface-variant/10 last:border-0 last:pb-0">
                <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">event</span>
                </div>
                <div>
                  <h4 className="font-bold text-on-surface">Annual Science Symposium</h4>
                  <p className="text-sm text-on-surface-variant/60 mt-1">Scheduled for Oct 24, 2026 • Main Auditorium</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-primary-gradient p-8 rounded-[2rem] text-white shadow-premium flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-bold mb-4">Quick Actions</h3>
            <p className="text-white/60 text-sm mb-8">Streamline your administrative tasks with our intelligent assistant.</p>
            
            <div className="space-y-3">
              <button className="w-full h-12 bg-white/10 hover:bg-white/20 transition-colors rounded-xl flex items-center px-4 gap-3 text-sm font-bold border border-white/10">
                <span className="material-symbols-outlined text-sm">person_add</span>
                Add New Student
              </button>
              <button className="w-full h-12 bg-white/10 hover:bg-white/20 transition-colors rounded-xl flex items-center px-4 gap-3 text-sm font-bold border border-white/10">
                <span className="material-symbols-outlined text-sm">schedule</span>
                View Faculty Schedule
              </button>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/10">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">System Status</span>
              </div>
              <span className="text-xs font-bold">Stable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
