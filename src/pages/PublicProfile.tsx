import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { CounterCard } from "@/components/CounterCard";

type Profile = { id: string; username: string; display_name: string | null; created_at: string };
type Counter = { id: string; title: string; category: string; started_at: string; best_streak_days: number; is_public: boolean };

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!username) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      setProfile(p);
      if (p) {
        const { data: cs } = await supabase
          .from("counters")
          .select("*")
          .eq("owner_id", p.id)
          .eq("is_public", true)
          .order("started_at", { ascending: true });
        setCounters((cs ?? []) as Counter[]);
      }
      setLoading(false);
    })();
  }, [username]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-10">
        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : !profile ? (
          <div className="text-center py-20">
            <h1 className="font-display text-2xl font-bold mb-2">User not found</h1>
            <Link to="/" className="text-accent hover:underline">Go home</Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="font-display text-4xl font-bold">{profile.display_name ?? profile.username}</h1>
              <p className="text-muted-foreground">@{profile.username}</p>
            </div>
            {counters.length === 0 ? (
              <p className="text-muted-foreground">No public counters yet.</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {counters.map((c) => (
                  <CounterCard
                    key={c.id}
                    id={c.id}
                    title={c.title}
                    category={c.category}
                    startedAt={c.started_at}
                    bestStreak={c.best_streak_days}
                    isPublic
                    ownerHandle={profile.username}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
