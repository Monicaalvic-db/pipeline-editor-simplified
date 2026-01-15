"use client";

import { BrandHeader } from "@/components/brand-header";
import { BrandSidebar } from "@/components/brand-sidebar/brand-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SidebarProvider>
          <div className="flex w-full h-screen bg-sidebar overflow-hidden">
            <BrandHeader />
            <div className="flex-1 flex mt-[3rem] overflow-hidden min-w-0">
              <BrandSidebar />
              <main className="flex-1 overflow-hidden bg-background border border-border rounded-lg mr-1 min-w-0 max-w-full">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
