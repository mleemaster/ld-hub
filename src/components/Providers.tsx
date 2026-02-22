/*
 * Client-side provider wrapper.
 * Combines NextAuth SessionProvider and next-themes ThemeProvider.
 */
"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
