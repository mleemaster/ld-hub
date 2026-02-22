/*
 * Badge component for status pills.
 * Color-coded variants for lead/project statuses.
 */
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-tertiary text-text-secondary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  info: "bg-accent/15 text-accent",
  neutral: "bg-surface-tertiary text-text-tertiary",
};

export default function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
