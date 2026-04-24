import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BigDayDisplay } from "./BigDayDisplay";
import { Globe, Lock, Flame, Skull } from "lucide-react";

type CounterCardProps = {
  id: string;
  title: string;
  category: string;
  startedAt: string;
  bestStreak: number;
  isPublic: boolean;
  cheers?: number;
  shames?: number;
  ownerHandle?: string;
};

export function CounterCard(p: CounterCardProps) {
  return (
    <Link to={`/counter/${p.id}`} className="group">
      <Card className="p-6 h-full transition-all duration-300 hover:shadow-pop hover:-translate-y-0.5 border-border/60">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-bold text-lg leading-tight truncate">{p.title}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Badge variant="secondary" className="rounded-full">{p.category}</Badge>
              {p.ownerHandle && <span>@{p.ownerHandle}</span>}
            </div>
          </div>
          <span className="text-muted-foreground" title={p.isPublic ? "Public" : "Private"}>
            {p.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </span>
        </div>
        <BigDayDisplay startedAt={p.startedAt} size="md" />
        <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
          <span>Best: <span className="font-mono-num font-semibold text-foreground">{p.bestStreak}</span>d</span>
          {p.isPublic && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-accent" /> {p.cheers ?? 0}</span>
              <span className="flex items-center gap-1"><Skull className="h-3.5 w-3.5" /> {p.shames ?? 0}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
