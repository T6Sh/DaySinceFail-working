import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { daysSince } from "@/lib/streak";
import { Flame, Skull, Trophy, Medal } from "lucide-react";

type Row = {
  id: string;
  title: string;
  category: string;
  started_at: string;
  best_streak_days: number;
  owner_id: string;
};
type Profile = { id: string; username: string };
type Reaction = { counter_id: string; kind: "cheer" | "shame" };

export default function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: cs } = await supabase
        .from("counters")
        .select("id,title,category,started_at,best_streak_days,owner_id")
        .eq("is_public", true);
      const list = (cs ?? []) as Row[];
      setRows(list);
      const ownerIds = [...new Set(list.map((r) => r.owner_id))];
      if (ownerIds.length) {
        const { data: ps } = await supabase.from("profiles").select("id,username").in("id", ownerIds);
        const map: Record<string, string> = {};
        (ps as Profile[] | null)?.forEach((p) => { map[p.id] = p.username; });
        setProfiles(map);
      }
      const ids = list.map((r) => r.id);
      if (ids.length) {
        const { data: rx } = await supabase.from("counter_reactions").select("counter_id,kind").in("counter_id", ids);
        setReactions((rx ?? []) as Reaction[]);
      }
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => ["all", ...Array.from(new Set(rows.map((r) => r.category)))], [rows]);

  const ranked = useMemo(() => {
    const reactionCounts: Record<string, { cheers: number; shames: number }> = {};
    reactions.forEach((r) => {
      reactionCounts[r.counter_id] ??= { cheers: 0, shames: 0 };
      if (r.kind === "cheer") reactionCounts[r.counter_id].cheers++;
      else reactionCounts[r.counter_id].shames++;
    });
    return rows
      .filter((r) => cat === "all" || r.category === cat)
      .filter((r) => !search || r.title.toLowerCase().includes(search.toLowerCase()))
      .map((r) => ({
        ...r,
        current: daysSince(r.started_at),
        cheers: reactionCounts[r.id]?.cheers ?? 0,
        shames: reactionCounts[r.id]?.shames ?? 0,
      }))
      .sort((a, b) => b.current - a.current);
  }, [rows, reactions, cat, search]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-10 max-w-4xl">
        <div className="text-center mb-8">
          <Trophy className="h-10 w-10 text-accent mx-auto mb-3" />
          <h1 className="font-display text-4xl font-bold">Hall of pride</h1>
          <p className="text-muted-foreground mt-2">Longest active streaks across the public counters.</p>
        </div>

        <div className="flex gap-3 mb-6 flex-wrap">
          <Input placeholder="Search counters…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <div className="flex gap-1.5 flex-wrap">
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  cat === c ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >{c}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : ranked.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">No public counters match.</Card>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border">
              {ranked.map((r, i) => (
                <li key={r.id}>
                  <Link to={`/counter/${r.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
                    <div className="w-8 text-center font-mono-num font-bold text-lg shrink-0">
                      {i === 0 ? <Medal className="h-5 w-5 text-warn mx-auto" /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold truncate">{r.title}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="rounded-full">{r.category}</Badge>
                        @{profiles[r.owner_id] ?? "user"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono-num text-2xl font-extrabold">{r.current}<span className="text-sm text-muted-foreground font-medium">d</span></div>
                      <div className="text-xs text-muted-foreground">best {r.best_streak_days}d</div>
                    </div>
                    <div className="hidden sm:flex flex-col gap-0.5 text-xs text-muted-foreground w-12 shrink-0">
                      <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-accent" />{r.cheers}</span>
                      <span className="flex items-center gap-1"><Skull className="h-3 w-3" />{r.shames}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </main>
    </div>
  );
}
