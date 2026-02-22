/*
 * Main application shell layout.
 * Composes Sidebar (desktop) + Header + MobileNav (mobile).
 * Content area offset adjusts when sidebar is collapsed.
 */
"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileNav from "./MobileNav";
import { cn } from "@/lib/utils";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className={cn("transition-[margin] duration-200 ease-in-out", collapsed ? "md:ml-16" : "md:ml-60")}>
        <Header />
        <main className="p-6 pb-20 md:pb-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
