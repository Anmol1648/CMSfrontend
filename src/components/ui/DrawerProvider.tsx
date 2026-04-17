"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Drawer } from "./Drawer";
import { DemoDrawerComponent } from "./drawers/DemoDrawer";

export type DrawerComponent<T = any> = React.ComponentType<T & { close: () => void }>;

interface DrawerState {
  isOpen: boolean;
  drawerKey: string | null;
  props: any;
}

interface DrawerContextType {
  openDrawer: (drawerKey: string, props?: any) => void;
  closeDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

// ==========================================
// CENTRALIZED DRAWER REGISTRY (The "Middle Point")
// ==========================================
const DRAWER_REGISTRY: Record<string, { component: DrawerComponent, title?: string, width?: string }> = {
  "DemoDrawer": {
    component: DemoDrawerComponent,
    title: "Quick Profile",
    width: "w-[500px]",
  },
  // Add new drawers to this registry object
};

export const DrawerProvider = ({ children }: { children: ReactNode }) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({
    isOpen: false,
    drawerKey: null,
    props: {},
  });

  const openDrawer = (drawerKey: string, props: any = {}) => {
    if (!DRAWER_REGISTRY[drawerKey]) {
      console.warn(`Drawer key "${drawerKey}" not found in DRAWER_REGISTRY.`);
      return;
    }
    setDrawerState({
      isOpen: true,
      drawerKey,
      props,
    });
  };

  const closeDrawer = () => {
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  };

  const ActiveComponentData = drawerState.drawerKey ? DRAWER_REGISTRY[drawerState.drawerKey] : null;
  const ActiveComponent = ActiveComponentData?.component;

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      {children}

      {ActiveComponentData && ActiveComponent && (
        <Drawer
          isOpen={drawerState.isOpen}
          onClose={closeDrawer}
          title={ActiveComponentData.title}
          width={ActiveComponentData.width}
        >
          <ActiveComponent close={closeDrawer} {...drawerState.props} />
        </Drawer>
      )}
    </DrawerContext.Provider>
  );
};

export const useDrawer = () => {
  const context = useContext(DrawerContext);
  if (context === undefined) {
    throw new Error("useDrawer must be used within a DrawerProvider");
  }
  return context;
};
