import * as React from "react";

export type ToastData = {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactElement;
  variant?: "default" | "destructive" | "success" | "warning";
};

export type ToastState = {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => void;
  dismiss: (id: string) => void;
};

export const ToastStateContext = React.createContext<ToastState | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastStateContext);
  if (!ctx) {
    throw new Error("useToast must be used within a Toaster");
  }
  return ctx.addToast;
}

export function useToastState() {
  const ctx = React.useContext(ToastStateContext);
  if (!ctx) {
    throw new Error("useToastState must be used within a Toaster");
  }
  return ctx;
}
