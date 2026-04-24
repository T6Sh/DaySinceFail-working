import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BigDayDisplay } from "@/components/BigDayDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { Flame, Skull, Trophy, Lock } from "lucide-react";

export default function Index() {
  const { user } = useAuth();
  // demo "started 12 days ago"
  const demoStart = new Date(Date.now() - 12 * 86_400_000).toISOString();

  return (
    <div className="min-h-screen bg-hero">
      <Navbar />

      <section className="container py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground mb-6">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Live shame & pride dashboard
            </div>
            <h1 className="font-display text-5xl sm:text-7xl font-extrabold leading-[0.95] tracking-tight text-balance">
              Days since I <span className="text-accent">screwed up</span>.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg">
              Like a factory safety sign — but for your bad habits. Track your streaks, reset when you slip, and let the world cheer or shame you into staying clean.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to={user ? "/dashboard" : "/auth?mode=signup"}>
                  {user ? "Go to dashboard" : "Start counting — free"}
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/leaderboard"><Trophy className="h-4 w-4 mr-1.5" />Leaderboard</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Flame className="h-4 w-4 text-accent" />Cheers</span>
              <span className="flex items-center gap-1.5"><Skull className="h-4 w-4" />Shames</span>
              <span className="flex items-center gap-1.5"><Lock className="h-4 w-4" />Private by default</span>
            </div>
          </div>

          <Card className="p-8 shadow-pop relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-warn via-accent to-warn" />
            <div className="text-center mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono">
              Days since I ate junk food
            </div>
            <BigDayDisplay startedAt={demoStart} size="lg" />
            <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="font-mono-num text-lg font-bold">21</div>
                <div className="text-muted-foreground">best</div>
              </div>
              <div className="rounded-lg bg-accent/10 p-3 text-accent">
                <div className="font-mono-num text-lg font-bold">142</div>
                <div className="opacity-80">🔥 cheers</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="font-mono-num text-lg font-bold">18</div>
                <div className="text-muted-foreground">💀 shames</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="container py-16 grid sm:grid-cols-3 gap-6">
        {[
          { t: "1. Create a counter", d: "Skipped gym, smoked, doom-scrolled — name your slip." },
          { t: "2. Stay clean", d: "Watch the digits climb. Hit milestones at 7, 30, 100, 365." },
          { t: "3. Go public (if you dare)", d: "Pin your counter to the leaderboard. Receive cheers — or shames." },
        ].map((s) => (
          <Card key={s.t} className="p-6">
            <h3 className="font-display font-bold text-lg mb-1">{s.t}</h3>
            <p className="text-sm text-muted-foreground">{s.d}</p>
          </Card>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Built for people who count their failures so they don't repeat them.
      </footer>
    </div>
  );
}
