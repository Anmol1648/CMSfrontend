import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layouts/Header";
import { Sidebar } from "@/components/layouts/Sidebar";
import { SplashProvider } from "@/components/ui/SplashProvider";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CMS | College Management System",
  description: "A premium, architectural-style College Management System by Lizone Design.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block" />
      </head>
      <body className={`${manrope.variable} ${inter.variable} font-manrope bg-surface selection:bg-primary/10 selection:text-primary no-scrollbar`}>
        <SplashProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col pl-64">
              <Header />
              <main className="flex-1 pt-24 px-12 pb-20">
                {children}
              </main>
            </div>
          </div>
        </SplashProvider>
      </body>
    </html>
  );
}
