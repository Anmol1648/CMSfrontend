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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
