/*
 * Card component — rounded container with border and surface background.
 */
import { cn } from "@/lib/utils";
import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-border bg-surface-secondary p-6",
          className,
        )}
        {...props}
      >
        {title && (
          <h3 className="text-sm font-medium text-text-secondary mb-4">{title}</h3>
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
export default Card;
