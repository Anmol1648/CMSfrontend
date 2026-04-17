import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";
import { SplashProvider } from "@/components/ui/SplashProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";

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
  title: "Academic Architect | College Management System",
  description: "A premium, architectural-style College Management System by Lizone Design.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block" />
      </head>
      <body className={`${manrope.variable} ${inter.variable} font-manrope bg-surface selection:bg-primary/10 selection:text-primary no-scrollbar`}>
        <StoreProvider>
          <QueryProvider>
            <SplashProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </SplashProvider>
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
