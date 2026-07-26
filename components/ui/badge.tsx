import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "open" | "taken" | "pending" | "neutral";
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "open" && "bg-amber-100 text-amber-800",
        tone === "taken" && "bg-slate-200 text-slate-600",
        tone === "pending" && "bg-amber-100 text-amber-800",
        tone === "neutral" && "bg-slate-100 text-slate-600",
        className
      )}
      {...props}
    />
  );
}
