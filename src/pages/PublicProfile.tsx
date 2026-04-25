import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { CounterCard } from "@/components/CounterCard";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { daysSince } from "@/lib/streak";
import { formatDistanceToNow } from "date-fns";
import { Flame, Skull, Trophy, Activity } from "lucide-react";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};
type Counter = {
  id: string;
  title: string;
  category: string;
  started_at: string;
  best_streak_days: number;
  is_public: boolean;
};
type Reaction = { counter_id: string; kind: "cheer" | "shame" };

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!username) return;
      setLoading(true);
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();
      setProfile(p as Profile | null);
      if (p) {
        const { data: cs } = await supabase
          .from("counters")
          .select("*")
          .eq("owner_id", p.id)
          .eq("is_public", true)
          .order("started_at", { ascending: true });
        const list = (cs ?? []) as Counter[];
        setCounters(list);
        if (list.length) {
          const { data: rx } = await supabase
            .from("counter_reactions")
            .select("counter_id, kind")
            .in(
              "counter_id",
              list.map((c) => c.id)
            );
          setReactions((rx ?? []) as Reaction[]);
        } else {
          setReactions([]);
        }
      }
      setLoading(false);
    })();
  }, [username]);

  const totals = counters.reduce(
    (acc, c) => {
      const cur = daysSince(c.started_at);
      acc.current += cur;
      acc.bestEver = Math.max(acc.bestEver, c.best_streak_days, cur);
      acc.longestNow = Math.max(acc.longestNow, cur);
      return acc;
    },
    { current: 0, bestEver: 0, longestNow: 0 }
  );
  const cheers = reactions.filter((r) => r.kind === "cheer").length;
  const shames = reactions.filter((r) => r.kind === "shame").length;
  const reactionsByCounter = reactions.reduce<Record<string, { c: number; s: number }>>(
    (acc, r) => {
      const e = (acc[r.counter_id] ??= { c: 0, s: 0 });
      if (r.kind === "cheer") e.c++;
      else e.s++;
      return acc;
    },
    {}
  );

  const initials = (profile?.display_name ?? profile?.username ?? "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-10">
        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : !profile ? (
          <div className="text-center py-20">
            <h1 className="font-display text-2xl font-bold mb-2">User not found</h1>
            <p className="text-muted-foreground mb-4">
              No one's claimed <span className="font-mono">@{username}</span> yet.
            </p>
            <Link to="/" className="text-accent hover:underline">
              Go home
            </Link>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-5 mb-8">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.username} />
                <AvatarFallback className="text-xl font-display">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="font-display text-4xl font-bold leading-tight truncate">
                  {profile.display_name ?? profile.username}
                </h1>
                <p className="text-muted-foreground">
                  @{profile.username} · joined{" "}
                  {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                </p>
              </div>
            </header>

            <section className="grid gap-4 sm:grid-cols-4 mb-10">
              <StatCard
                icon={<Activity className="h-4 w-4" />}
                label="Public counters"
                value={counters.length}
              />
              <StatCard
                icon={<Trophy className="h-4 w-4" />}
                label="Longest current streak"
                value={`${totals.longestNow}d`}
              />
              <StatCard
                icon={<Flame className="h-4 w-4 text-accent" />}
                label="Cheers received"
                value={cheers}
              />
              <StatCard icon={<Skull className="h-4 w-4" />} label="Shames received" value={shames} />
            </section>

            {counters.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <h3 className="font-display text-xl font-semibold mb-1">Nothing public yet</h3>
                <p className="text-muted-foreground">
                  @{profile.username} hasn't shared any counters.
                </p>
              </Card>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold mb-4">Counters</h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {counters.map((c) => {
                    const r = reactionsByCounter[c.id];
                    return (
                      <CounterCard
                        key={c.id}
                        id={c.id}
                        title={c.title}
                        category={c.category}
                        startedAt={c.started_at}
                        bestStreak={c.best_streak_days}
                        isPublic
                        cheers={r?.c ?? 0}
                        shames={r?.s ?? 0}
                        ownerHandle={profile.username}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-mono-num text-3xl font-bold">{value}</div>
    </Card>
  );
}
