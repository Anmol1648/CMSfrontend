import React from "react";
import { cn } from "@/lib/utils";

const NavItem = ({ icon, label, active = false }: { icon: string; label: string; active?: boolean }) => (
  <a
    href="#"
    className={cn(
      "flex items-center gap-3 px-4 py-3 transition-all duration-200 group relative",
      active 
        ? "text-primary font-bold bg-surface-container-high rounded-r-full scale-98 shadow-sm" 
        : "text-on-surface-variant hover:text-primary hover:bg-surface-container-high/50 rounded-r-full"
    )}
  >
    <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}>
      {icon}
    </span>
    <span className="text-sm tracking-tight">{label}</span>
    {active && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />
    )}
  </a>
);

export const Sidebar = () => {
  return (
    <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-surface-container-low flex flex-col py-8 px-4 z-50 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
      <div className="mb-10 px-4">
        <h1 className="text-2xl font-black tracking-tighter text-primary">Academic Architect</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold mt-1">Lizone Design</p>
      </div>

      <nav className="flex-1 space-y-1 pr-2">
        <NavItem icon="dashboard" label="Dashboard" active />
        <NavItem icon="school" label="Students" />
        <NavItem icon="auto_stories" label="Academics" />
        <NavItem icon="account_balance_wallet" label="Financials" />
        <NavItem icon="analytics" label="Reports" />
        <NavItem icon="groups" label="Faculty" />
      </nav>

      <div className="mt-auto pt-8 space-y-1 border-t border-outline-variant/30 pr-2">
        <button className="w-full flex items-center justify-center gap-2 py-3 mb-6 bg-primary-container text-white rounded-xl shadow-premium hover:opacity-90 active:scale-98 transition-all font-semibold">
          <span className="material-symbols-outlined text-sm">add</span>
          <span className="text-sm">New Project</span>
        </button>
        
        <NavItem icon="settings" label="Settings" />
        <NavItem icon="contact_support" label="Support" />
        
        <div className="mt-6 pt-6 border-t border-outline-variant/30 px-4">
          <div className="flex items-center gap-3 text-on-surface-variant/40 hover:text-primary transition-colors cursor-pointer group">
            <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">logout</span>
            <span className="text-xs font-bold uppercase tracking-widest">Logout</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
