"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { logout } from "@/lib/store/slices/authSlice";
import { useToast } from "@/components/ui/ToastProvider";
import { useModal } from "@/components/ui/ModalProvider";
import { useProfile } from "@/lib/hooks/useProfile";
import { useAuth } from "@/lib/hooks/useAuth";

export const Header = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { openModal, closeModal } = useModal();
  const { user } = useAppSelector((state) => state.auth);
  const { profile } = useProfile();
  const { handleLogout: performLogout, handleLogoutAll: performLogoutAll } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogoutClick = () => {
    openModal("Logout", {
      onLogout: async () => {
        await performLogout();
        closeModal();
      },
      onLogoutAll: async () => {
        await performLogoutAll();
        closeModal();
      },
      onCancel: () => closeModal(),
    });
  };


  return (
    <header className="fixed top-0 right-0 left-64 h-20 bg-surface/80 backdrop-blur-xl flex justify-between items-center px-12 z-40 border-b border-outline-variant/10">
      <div className="flex items-center w-1/2">
        <div className="relative w-full max-w-md group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
            search
          </span>
          <input
            type="text"
            placeholder="Search resources, students, or faculty..."
            className="w-full pl-12 pr-4 py-2.5 bg-surface-container-highest/50 border-none rounded-full focus:ring-2 focus:ring-primary/20 text-sm text-on-surface placeholder:text-on-surface-variant/40 transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-on-surface-variant hover:text-primary transition-all">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
        </button>
        
        <button
          onClick={handleLogoutClick}
          className="flex items-center gap-2 p-2 text-on-surface-variant hover:text-error transition-all group"
          title="Logout"
        >
          <span className="material-symbols-outlined transition-transform group-hover:rotate-180">logout</span>
        </button>


        <Link href="/settings" className="flex items-center gap-3 pl-4 border-l border-outline-variant/30 hover:bg-surface-container-high/20 transition-all rounded-lg p-1 group/profile">
          <div className="text-right">
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest leading-tight">Institutional Profile</p>
            <p className="text-sm font-bold text-primary group-hover/profile:text-primary-container transition-colors">
              {isMounted ? (user?.email || "Academic Professional") : "Academic Professional"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-surface-container-high shadow-premium flex items-center justify-center bg-primary text-white font-bold text-sm overflow-hidden group-hover/profile:scale-105 transition-transform">
            {isMounted ? (
              profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.email?.charAt(0).toUpperCase() || "A"
              )
            ) : "A"}
          </div>
        </Link>
      </div>
    </header>
  );
};
