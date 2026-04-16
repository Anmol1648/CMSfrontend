import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export const InstitutionalOverview = () => {
  return (
    <section className="mb-12">
      <div className="flex justify-between items-end gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">Live Academic Session</span>
          </div>
          <h2 className="text-display-lg text-primary mb-2">Institutional Overview</h2>
          <p className="text-on-surface-variant text-lg max-w-2xl leading-relaxed">
            Welcome back, <span className="text-primary font-bold">Dr. Thorne</span>. Today's academic metrics show a <span className="text-primary font-bold">4.2% increase</span> in research output across all faculties.
          </p>
        </div>
        
        <div className="flex gap-4 mb-2">
          <Button variant="tertiary" className="bg-surface-container-high hover:bg-surface-variant text-primary font-bold px-8">
            Download Audit
          </Button>
          <Button className="gradient-primary text-white font-bold px-8 shadow-premium">
            Generate Report
          </Button>
        </div>
      </div>
    </section>
  );
};
