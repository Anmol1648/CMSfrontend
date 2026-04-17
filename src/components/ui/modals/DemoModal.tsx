"use client";

import React from "react";
import { Button } from "../Button";

interface DemoModalProps {
  close: () => void;
  titleOverride?: string;
}

export const DemoModalComponent = ({ close, titleOverride }: DemoModalProps) => {
  return (
    <div className="space-y-6">
      <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10">
        <h4 className="text-sm font-bold text-primary mb-2">Centralized Architecture</h4>
        <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
          {titleOverride || "This modal component is completely decoupled from the page tree! It was invoked globally via the registry. You can specify dynamic height and width directly inside the registry settings."}
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" className="bg-transparent border-2 border-outline-variant text-on-surface hover:bg-surface-container-high" onClick={close}>Cancel</Button>
        <Button onClick={close}>Confirm Diagnostics</Button>
      </div>
    </div>
  );
};
