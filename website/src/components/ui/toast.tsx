import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const toastVariants = cva(
  cn(
    "group pointer-events-auto relative flex w-full max-w-md",
    "cursor-default align-middle",
    "overflow-hidden rounded-xl border p-4 shadow-lg transition-all",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-80",
    "data-[state=open]:animate-in data-[state=open]:fade-in-80",
    "data-[swipe=horizontal]:translate-x-(--radix-toast-swipe-x)",
    "data-[swipe=vertical]:translate-y-(--radix-toast-swipe-y)",
  ),
  {
    variants: {
      variant: {
        default:
          cn(
            "border-border/50 bg-background/95",
            "backdrop-blur-xl supports-[backdrop-filter]:bg-background/60",
          ),
        destructive:
          "group border-destructive/30 bg-destructive text-destructive-foreground",
        success:
          "group border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:text-emerald-50",
        warning:
          "group border-amber-500/30 bg-amber-50 text-amber-900 dark:text-amber-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const toastAnimation = cn(
  "data-[state=open]:slide-in-from-top-full data-[state=closed]:slide-out-to-bottom-full",
);

export const ToastProvider = ToastPrimitives.Provider;

export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-3 p-4",
      "sm:top-4 sm:max-w-sm sm:translate-x-full sm:justify-self-auto sm:translate-y-0",
      "sm:right-4 sm:left-auto",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), toastAnimation, className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

export const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex shrink-0 justify-center rounded-md border bg-transparent px-2.5 py-1.5 text-xs font-medium",
      "shadow-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-background",
      "disabled:pointer-events-none disabled:opacity-50",
      "group[&[data-variant=destroy]]:group-hover:bg-destructive/10 group[&[data-variant=destroy]]:text-destructive",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

export const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "group-[&[data-variant=destroy]:text-destructive] group absolute right-2 top-2",
      "rounded-md p-1 text-foreground/50 opacity-0 transition-opacity",
      "hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring",
      "group-hover:opacity-100 group-[&[data-state=open]]:opacity-100",
      className,
    )}
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

export const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

export const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn(
      "mt-1 text-sm text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a]:hover:text-foreground",
      className,
    )}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
