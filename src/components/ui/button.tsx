import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300",
  {
    variants: {
      variant: {
        default: "bg-amber-300 text-zinc-950 shadow-[0_0_28px_rgba(252,211,77,0.25)] hover:bg-amber-200",
        secondary: "border border-white/15 bg-white/8 text-white hover:bg-white/12",
        ghost: "text-zinc-200 hover:bg-white/10",
        danger: "bg-red-500 text-white hover:bg-red-400",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild, children, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (asChild && React.isValidElement<{ className?: string }>(children)) {
    return React.cloneElement(children, {
      className: cn(classes, children.props.className),
    });
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
