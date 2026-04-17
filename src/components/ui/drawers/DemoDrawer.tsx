"use client";

import React from "react";
import { Button } from "../Button";
import { Avatar } from "../Avatar";

interface DemoDrawerProps {
  close: () => void;
}

export const DemoDrawerComponent = ({ close }: DemoDrawerProps) => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4 text-center pb-8 border-b border-outline-variant/10">
        <div className="w-24 h-24 rounded-full border-4 border-surface-container-high shadow-premium flex items-center justify-center bg-primary text-white font-bold text-3xl">
          AT
        </div>
        <div>
          <h4 className="text-xl font-bold text-primary">Dr. Alistair Thorne</h4>
          <p className="text-sm text-on-surface-variant/60 font-medium">Chief Administrator</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em] mb-3 block">Department</label>
          <p className="text-sm font-bold text-primary bg-surface-container-low px-4 py-3 rounded-xl">Administration & Strategy</p>
        </div>

        <div>
          <label className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em] mb-3 block">Contact Information</label>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-on-surface-variant font-medium bg-surface-container-low px-4 py-3 rounded-xl">
              <span className="material-symbols-outlined text-primary text-lg">mail</span>
              a.thorne@academic.edu
            </div>
            <div className="flex items-center gap-3 text-sm text-on-surface-variant font-medium bg-surface-container-low px-4 py-3 rounded-xl">
              <span className="material-symbols-outlined text-primary text-lg">call</span>
              +1 (555) 123-4567
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8">
        <Button onClick={close} className="w-full h-12 gradient-primary text-white font-bold">
          Close Profile
        </Button>
      </div>
    </div>
  );
};
