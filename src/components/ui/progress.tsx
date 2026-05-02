import { cn } from "@/lib/utils";

export function RatingBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-white/10", className)}>
      <div
        className="h-full rounded-full bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.45)]"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
