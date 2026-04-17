"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Modal } from "./Modal";
import { DemoModalComponent } from "./modals/DemoModal";
import { ConfirmDialog } from "./modals/ConfirmDialog";
import { MfaSetupModal } from "./modals/MfaSetupModal";
import { LogoutDialog } from "./modals/LogoutDialog";
import { MfaDisableModal } from "./modals/MfaDisableModal";


export type ModalComponent<T = any> = React.ComponentType<T & { close: () => void }>;


interface ModalState {
  isOpen: boolean;
  modalKey: string | null;
  props: any;
}

interface ModalContextType {
  openModal: (modalKey: string, props?: any) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

// ==========================================
// CENTRALIZED MODAL REGISTRY (The "Middle Point")
// ==========================================
const MODAL_REGISTRY: Record<string, { component: ModalComponent, title?: string, width?: string, height?: string }> = {
  "DemoModal": {
    component: DemoModalComponent,
    title: "System Diagnostics",
    width: "max-w-2xl",
  },
  "ConfirmAction": {
    component: ConfirmDialog as any,
    title: "Confirm Action",
    width: "max-w-md",
  },
  "Logout": {
    component: LogoutDialog as any,
    title: "Sign Out Preference",
    width: "max-w-md",
  },
  "MfaSetup": {
    component: MfaSetupModal as any,
    title: "Setup MFA",
    width: "max-w-sm",
  },
  "MfaDisable": {
    component: MfaDisableModal as any,
    title: "Disable Security",
    width: "max-w-sm",
  },
};




export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    modalKey: null,
    props: {},
  });

  const openModal = (modalKey: string, props: any = {}) => {
    if (!MODAL_REGISTRY[modalKey]) {
      console.warn(`Modal key "${modalKey}" not found in MODAL_REGISTRY.`);
      return;
    }
    setModalState({
      isOpen: true,
      modalKey,
      props,
    });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const ActiveComponentData = modalState.modalKey ? MODAL_REGISTRY[modalState.modalKey] : null;
  const ActiveComponent = ActiveComponentData?.component;

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      
      {ActiveComponentData && ActiveComponent && (
        <Modal 
          isOpen={modalState.isOpen} 
          onClose={closeModal}
          title={ActiveComponentData.title}
          width={ActiveComponentData.width}
          height={ActiveComponentData.height}
        >
          <ActiveComponent close={closeModal} {...modalState.props} />
        </Modal>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};
