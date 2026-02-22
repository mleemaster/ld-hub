/*
 * Dashboard layout — wraps all authenticated pages in the AppShell.
 * Route group (dashboard) doesn't affect URLs.
 */
import AppShell from "@/components/layout/AppShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
