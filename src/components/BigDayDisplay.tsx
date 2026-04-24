import { useEffect, useState } from "react";
import { daysSince } from "@/lib/streak";
import { cn } from "@/lib/utils";

export function BigDayDisplay({ startedAt, className, size = "lg" }: { startedAt: string; className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const [days, setDays] = useState(() => daysSince(startedAt));
  useEffect(() => {
    setDays(daysSince(startedAt));
    const t = setInterval(() => setDays(daysSince(startedAt)), 60_000);
    return () => clearInterval(t);
  }, [startedAt]);

  const sizes = {
    sm: "text-5xl",
    md: "text-7xl",
    lg: "text-[8rem] sm:text-[10rem]",
    xl: "text-[10rem] sm:text-[14rem]",
  } as const;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <span className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground mb-2">days since</span>
      <span key={days} className={cn("font-mono-num font-extrabold leading-none animate-flip", sizes[size])}>
        {days.toString().padStart(2, "0")}
      </span>
      <span className="mt-3 text-sm font-medium text-muted-foreground">
        {days === 1 ? "day" : "days"}
      </span>
    </div>
  );
}
