import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-white/12 bg-black/35 px-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15",
        className,
      )}
      {...props}
    />
  );
}
