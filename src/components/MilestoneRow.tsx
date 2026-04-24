import { MILESTONES } from "@/lib/streak";
import { cn } from "@/lib/utils";
import { Lock, Award } from "lucide-react";

export function MilestoneRow({ days }: { days: number }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {MILESTONES.map((m) => {
        const unlocked = days >= m;
        return (
          <div
            key={m}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
              unlocked
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border bg-muted/40 text-muted-foreground"
            )}
          >
            {unlocked ? <Award className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
            {m}d
          </div>
        );
      })}
    </div>
  );
}
