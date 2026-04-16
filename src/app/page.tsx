"use client";

import { InstitutionalOverview } from "@/components/dashboard/InstitutionalOverview";
import { StatCard } from "@/components/dashboard/StatCard";
import { DatePicker } from "@/components/ui/DatePicker";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Toggle } from "@/components/ui/Toggle";
import { Badge } from "@/components/ui/Badge";
import { Avatar, AvatarGroup } from "@/components/ui/Avatar";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Tabs } from "@/components/ui/Tabs";
import { Inbox, Calendar, Search, Bell, Settings, Filter, Plus } from "lucide-react";
import React, { useState } from "react";

// Sample Data for Showcase
const tableData = [
  { id: "#ST-1024", name: "Saurabh Sharma", course: "Computer Science", status: "Active", attendance: "98%" },
  { id: "#ST-1025", name: "Anish Gupta", course: "Mechanical Eng.", status: "Pending", attendance: "85%" },
  { id: "#ST-1026", name: "Hemant Kumar", course: "B.A. Economics", status: "Active", attendance: "92%" },
  { id: "#ST-1027", name: "Priya Singh", course: "B.Sc Physics", status: "Inactive", attendance: "45%" },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-8">
      {/* Dynamic Breadcrumbs */}
      <Breadcrumbs items={[{ label: "Dashboard" }, { label: "Institutional Overview" }]} />

      {/* Editorial Hero */}
      <InstitutionalOverview />

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          icon="school" 
          label="Total Students" 
          value="12,840" 
          trend={{ value: "+12%", type: "up" }} 
        />
        <StatCard 
          icon="groups" 
          label="Faculty Members" 
          value="1,142" 
          trend={{ value: "Stable", type: "neutral" }} 
          colorClass="bg-secondary-fixed"
        />
        <StatCard 
          icon="payments" 
          label="Outstanding Fees" 
          value="$2.4M" 
          trend={{ value: "-3%", type: "down" }} 
          colorClass="bg-error-container text-error"
        />
        <StatCard 
          icon="biotech" 
          label="Active Research" 
          value="458" 
          trend={{ value: "+8.5%", type: "up" }} 
          colorClass="bg-tertiary-fixed text-tertiary"
        />
      </div>

      {/* THE DIGITAL ATELIER: Component Showcase Gallery */}
      <section className="pt-8 space-y-8">
        <Tabs 
          tabs={[
            { id: "overview", label: "Dashboard Overview" },
            { id: "components", label: "Component Gallery" },
            { id: "metrics", label: "Advanced Metrics" }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="mb-10">
          <h3 className="text-headline-lg text-primary mb-2 italic">The Digital Atelier Showcase</h3>
          <p className="text-on-surface-variant/60 text-sm font-medium tracking-tight">Reviewing the "Academic Architect" premium component library by Lizone Design.</p>
        </div>

        <div className="grid grid-cols-12 gap-10">
          {/* Left Column: Interactive Elements */}
          <div className="col-span-12 lg:col-span-7 space-y-10">
            
            {/* Input & Selection Showcase */}
            <Card className="p-8 space-y-8 elevated-card">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6">Forms & Selection</h4>
              
              <div className="grid grid-cols-2 gap-8">
                <DatePicker label="Academic Start Date" defaultValue="2026-04-14" />
                <CustomSelect 
                  label="Department Filter" 
                  options={[
                    { value: "cs", label: "Computer Science" },
                    { value: "eng", label: "Engineering" },
                    { value: "art", label: "Arts & Humanities" }
                  ]}
                />
              </div>

              <div className="flex flex-wrap gap-12 pt-4">
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Toggle States</p>
                  <Toggle label="Email Notifications" defaultChecked />
                  <Toggle label="Auto-Enrollment" />
                </div>
                
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Checkboxes</p>
                  <Toggle label="Accept Terms" type="checkbox" defaultChecked />
                  <Toggle label="Include Legacy Data" type="checkbox" />
                </div>
              </div>
            </Card>

            {/* High Density Data Table */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Student Registry (High Density)</h4>
                <div className="flex gap-2">
                  <Button variant="tertiary" className="h-8 px-3 py-0 text-xs gap-1.5 bg-surface-container text-primary">
                    <Filter size={12} /> Filter
                  </Button>
                  <Button className="h-8 px-3 py-0 text-xs gap-1.5 gradient-primary text-white">
                    <Plus size={12} /> Add Student
                  </Button>
                </div>
              </div>
              <DataTable 
                columns={[
                  { header: "Student ID", accessor: "id" },
                  { header: "Full Name", accessor: (row) => (
                    <div className="flex items-center gap-3">
                      <Avatar initials={row.name.charAt(0)} size="sm" />
                      {row.name}
                    </div>
                  )},
                  { header: "Academic Course", accessor: "course" },
                  { header: "Status", accessor: (row) => (
                    <Badge variant={row.status === "Active" ? "success" : row.status === "Pending" ? "warning" : "error"}>
                      {row.status}
                    </Badge>
                  )},
                  { header: "Attendance", accessor: "attendance", className: "text-right" }
                ]}
                data={tableData}
              />
            </div>
          </div>

          {/* Right Column: Status & Indicators */}
          <div className="col-span-12 lg:col-span-5 space-y-10">
            <Card className="p-8 elevated-card bg-[#1A365D] text-white overflow-hidden relative">
              <div className="relative z-10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-6">Group Management</h4>
                <div className="space-y-8">
                  <div>
                    <label className="text-xs font-bold opacity-60 mb-3 block italic">Research Fellows</label>
                    <AvatarGroup>
                      <Avatar initials="JD" />
                      <Avatar initials="ST" className="bg-emerald-500 text-white" />
                      <Avatar initials="AK" />
                      <Avatar initials="HP" className="bg-orange-500 text-white" />
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold border-2 border-[#1A365D]">
                        +12
                      </div>
                    </AvatarGroup>
                  </div>
                  
                  <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                    <div>
                      <p className="text-xs opacity-50 font-bold uppercase tracking-widest mb-1">Server Status</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                        <span className="text-sm font-bold tracking-tight text-white">Academic Cloud Online</span>
                      </div>
                    </div>
                    <Button variant="tertiary" className="h-9 bg-white/10 hover:bg-white/20 text-white font-bold px-4 border-none text-xs">
                      Diagnostics
                    </Button>
                  </div>
                </div>
              </div>
              <div className="absolute -right-12 -bottom-12 opacity-5 scale-150 rotate-12">
                <Search size={200} />
              </div>
            </Card>

            {/* Quick Stats / Timeline */}
            <div className="bg-surface-container-low p-8 rounded-2xl space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Academic Calendar</h4>
              <div className="space-y-6">
                {[
                  { date: "Oct 24", title: "Faculty Senate Meeting", type: "primary" },
                  { date: "Oct 28", title: "Research Grant Deadline", type: "tertiary" },
                  { date: "Nov 02", title: "Mid-Term Assessment", type: "secondary" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 group cursor-pointer">
                    <div className="w-12 h-14 bg-surface-container-highest rounded-xl flex flex-col items-center justify-center text-primary group-hover:scale-105 transition-transform">
                      <span className="text-[10px] font-black uppercase">{item.date.split(" ")[0]}</span>
                      <span className="text-lg font-black leading-tight tracking-tighter">{item.date.split(" ")[1]}</span>
                    </div>
                    <div className="flex-1 py-1">
                      <p className="text-sm font-bold text-primary mb-1 group-hover:text-primary/70 transition-colors">{item.title}</p>
                      <p className="text-[10px] font-medium text-on-surface-variant/40 tracking-widest uppercase">10:00 AM • Main Hall</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="tertiary" className="w-full h-12 bg-white/50 text-primary font-bold shadow-sm">
                View All Events
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
