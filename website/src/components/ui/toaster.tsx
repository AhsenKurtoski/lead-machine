"use client";

import * as React from "react";
import { ToastProvider as RadixToastProvider, ToastViewport } from "@/components/ui/toast";
import { ToastStateContext, type ToastData, type ToastState } from "@/components/ui/use-toast";
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from "@/components/ui/toast";

const TOAST_LIMIT = 5;

function genId() {
  let count = 0;
  return () => {
    count = (count + 1) % Number.MAX_SAFE_INTEGER;
    return count.toString();
  };
}

const nextId = genId();

export function Toaster({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastData, "id">) => {
    const id = nextId();
    setToasts((prev) => {
      const newToasts = [...prev, { ...toast, id }];
      if (newToasts.length > TOAST_LIMIT) {
        return newToasts.slice(newToasts.length - TOAST_LIMIT);
      }
      return newToasts;
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const state: ToastState = { toasts, addToast, dismiss };

  return (
    <ToastStateContext.Provider value={state}>
      <RadixToastProvider>
        {children}
        {toasts.map((toast) => (
          <Toast key={toast.id} variant={toast.variant}>
            {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
            {toast.description && (
              <ToastDescription>{toast.description}</ToastDescription>
            )}
            {toast.action}
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </RadixToastProvider>
    </ToastStateContext.Provider>
  );
}
