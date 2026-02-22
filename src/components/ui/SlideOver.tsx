/*
 * Slide-over panel component using React Portal.
 * Slides in from the right, closes on backdrop click or Escape key.
 */
"use client";

import { useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

function useDelayedOpen(open: boolean) {
  const visible = useRef(false);
  const subscribers = useRef(new Set<() => void>());

  const subscribe = useCallback((cb: () => void) => {
    subscribers.current.add(cb);
    return () => { subscribers.current.delete(cb); };
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          visible.current = true;
          subscribers.current.forEach((cb) => cb());
        });
      });
    } else {
      visible.current = false;
      subscribers.current.forEach((cb) => cb());
    }
  }, [open]);

  return useSyncExternalStore(subscribe, () => visible.current, () => false);
}

export default function SlideOver({ open, onClose, title, children, className }: SlideOverProps) {
  const visible = useDelayedOpen(open);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-full max-w-2xl bg-surface border-l border-border shadow-2xl flex flex-col transition-transform duration-200 ease-in-out",
          visible ? "translate-x-0" : "translate-x-full",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <h2 className="text-lg font-semibold text-text-primary truncate">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors text-text-tertiary cursor-pointer shrink-0 ml-4"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
