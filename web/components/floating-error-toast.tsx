"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_MS = 5000;

export type FloatingErrorToastProps = {
  message: string | null;
  /** Called when the toast auto-hides. Omit to keep parent state (e.g. verify page still shows actions). */
  onDismiss?: () => void;
  autoDismissMs?: number;
  variant?: "error" | "success";
};

/**
 * Fixed bottom error toast. Auto-hides after `autoDismissMs` (default 5s).
 * Uses z-[100] so it appears above dialogs (z-50).
 */
export function FloatingErrorToast({
  message,
  onDismiss,
  autoDismissMs = DEFAULT_MS,
  variant = "error",
}: FloatingErrorToastProps) {
  const onDismissRef = useRef(onDismiss);
  const toastRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!message) {
      timerRef.current = null;
      return;
    }
    if (toastRef.current) {
      toastRef.current.hidden = false;
      toastRef.current.removeAttribute("aria-hidden");
      toastRef.current.style.opacity = "1";
      toastRef.current.style.transform = "translateX(-50%) translateY(0)";
    }
    if (autoDismissMs <= 0) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (onDismissRef.current) {
        onDismissRef.current();
        return;
      }
      if (!toastRef.current) return;
      toastRef.current.setAttribute("aria-hidden", "true");
      toastRef.current.style.opacity = "0";
      toastRef.current.style.transform = "translateX(-50%) translateY(8px)";
    }, autoDismissMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [message, autoDismissMs]);

  if (!message) return null;

  return (
    <div
      ref={toastRef}
      role="alert"
      aria-live={variant === "success" ? "polite" : "assertive"}
      className={cn(
        "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[100] w-fit max-w-[min(calc(100vw-1.5rem),36rem)] -translate-x-1/2 border bg-background/95 text-center shadow-lg transition-all duration-200 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 break-words",
        variant === "success"
          ? "rounded-lg border-emerald-500/35 px-3 py-2 text-xs font-medium leading-none text-emerald-600"
          : "rounded-xl border-destructive/35 px-4 py-3 text-sm leading-relaxed text-destructive"
      )}
    >
      {message}
    </div>
  );
}
