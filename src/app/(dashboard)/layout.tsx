"use client";

/**
 * Dashboard route group layout.
 * Contains the full app shell: Sidebar + Header + content area.
 * Only renders for authenticated dashboard routes.
 */

import { Header } from "@/components/layouts/Header";
import { Sidebar } from "@/components/layouts/Sidebar";
import { ModalProvider } from "@/components/ui/ModalProvider";
import { DrawerProvider } from "@/components/ui/DrawerProvider";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/store/hooks";
import { setPermissions, setMenus } from "@/lib/store/slices/authSlice";
import { rbacApi } from "@/lib/api/endpoints/rbac.endpoints";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    rbacApi.getMyPermissions()
      .then((res) => {
        if (res && Array.isArray(res)) {
          dispatch(setPermissions(res));
        }
      })
      .catch((err) => {
        console.error("Failed to load generic permissions:", err);
      });

    rbacApi.getMyMenus()
      .then((res) => {
        if (res && Array.isArray(res)) {
          dispatch(setMenus(res));
        }
      })
      .catch((err) => {
        console.error("Failed to load dynamic menus:", err);
      });
  }, [dispatch]);

  return (
    <DrawerProvider>
      <ModalProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col pl-64">
            <Header />
            <main className="flex-1 pt-24 px-12 pb-20">{children}</main>
          </div>
        </div>
      </ModalProvider>
    </DrawerProvider>
  );
}
