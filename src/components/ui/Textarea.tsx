/*
 * Textarea component with label and error message support.
 * Matches Input component styling and API.
 */
import { cn } from "@/lib/utils";
import { type TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "w-full px-4 py-2.5 rounded-xl bg-surface-secondary border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all text-sm resize-y min-h-[80px]",
            error ? "border-danger" : "border-border",
            className,
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-danger">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export default Textarea;
