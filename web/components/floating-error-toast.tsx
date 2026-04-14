"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_MS = 5000;

export type FloatingErrorToastProps = {
  message: string | null;
  /** Called when the toast auto-hides. Omit to keep parent state (e.g. verify page still shows actions). */
  onDismiss?: () => void;
  autoDismissMs?: number;
};

/**
 * Fixed bottom error toast. Auto-hides after `autoDismissMs` (default 5s).
 * Uses z-[100] so it appears above dialogs (z-50).
 */
export function FloatingErrorToast({ message, onDismiss, autoDismissMs = DEFAULT_MS }: FloatingErrorToastProps) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (autoDismissMs <= 0) return;
    timerRef.current = setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
      onDismissRef.current?.();
    }, autoDismissMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [message, autoDismissMs]);

  if (!message || !visible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[100] w-fit max-w-[min(calc(100vw-1.5rem),36rem)] -translate-x-1/2 rounded-xl border border-destructive/35 bg-background/95 px-4 py-3 text-center text-sm leading-relaxed text-destructive shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-background/85 break-words"
    >
      {message}
    </div>
  );
}
