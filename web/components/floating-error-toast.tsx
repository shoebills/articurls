"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
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
      toastRef.current.style.transform = "translateY(0)";
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
      toastRef.current.style.transform = "translateY(8px)";
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
      className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[100] flex justify-center px-4"
    >
      <div
        ref={toastRef}
        role="alert"
        aria-live={variant === "success" ? "polite" : "assertive"}
        className={cn(
          "pointer-events-auto w-fit max-w-[36rem] break-words border shadow-lg transition-all duration-200 backdrop-blur-md supports-[backdrop-filter]:bg-background/85",
          variant === "success"
            ? "flex items-center gap-2 rounded-full border-emerald-500/30 bg-emerald-50/95 px-4 py-2 text-sm font-medium text-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.18)] dark:bg-emerald-950/70 dark:text-emerald-200"
            : "rounded-xl border-destructive/35 bg-background/95 px-4 py-3 text-center text-sm leading-relaxed text-destructive"
        )}
      >
        {variant === "success" ? (
          <>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-3 w-3" />
            </span>
            <span>{message}</span>
          </>
        ) : (
          message
        )}
      </div>
    </div>
  );
}
