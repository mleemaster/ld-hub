/*
 * Top header bar with theme toggle and sign out.
 * Sticky, with backdrop blur for a polished feel.
 */
"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { signOut } from "next-auth/react";

export default function Header() {
  return (
    <header className="h-14 flex items-center justify-end px-6 border-b border-border bg-surface/80 backdrop-blur-xl sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={() => signOut()}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
