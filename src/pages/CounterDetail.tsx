import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { BigDayDisplay } from "@/components/BigDayDisplay";
import { MilestoneRow } from "@/components/MilestoneRow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { daysSince } from "@/lib/streak";
import { Flame, Skull, Globe, Lock, Trash2, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Counter = {
  id: string; owner_id: string; title: string; category: string; description: string | null;
  started_at: string; best_streak_days: number; is_public: boolean;
};
type Reset = { id: string; reset_at: string; streak_days: number; note: string | null };
type Reaction = { id: string; user_id: string; kind: "cheer" | "shame" };

export default function CounterDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [counter, setCounter] = useState<Counter | null>(null);
  const [resets, setResets] = useState<Reset[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [ownerHandle, setOwnerHandle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetNote, setResetNote] = useState("");
  const [resetOpen, setResetOpen] = useState(false);

  async function load() {
    if (!id) return;
    const { data: c, error } = await supabase.from("counters").select("*").eq("id", id).maybeSingle();
    if (error || !c) { setLoading(false); return; }
    setCounter(c as Counter);
    const [{ data: rs }, { data: rx }, { data: pr }] = await Promise.all([
      supabase.from("counter_resets").select("*").eq("counter_id", id).order("reset_at", { ascending: false }),
      supabase.from("counter_reactions").select("*").eq("counter_id", id),
      supabase.from("profiles").select("username").eq("id", c.owner_id).maybeSingle(),
    ]);
    setResets((rs ?? []) as Reset[]);
    setReactions((rx ?? []) as Reaction[]);
    setOwnerHandle(pr?.username ?? null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="min-h-screen"><Navbar /><div className="container py-20 text-center text-muted-foreground">Loading…</div></div>;
  if (!counter) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-20 text-center max-w-md">
        <Lock className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <h1 className="font-display text-2xl font-bold mb-2">Can't open this counter</h1>
        <p className="text-muted-foreground mb-4">
          {user ? "It's private, deleted, or doesn't belong to you." : "It might be private. Try signing in."}
        </p>
        <Link to={user ? "/dashboard" : "/auth"} className="text-accent hover:underline">
          {user ? "Back to dashboard" : "Sign in"}
        </Link>
      </div>
    </div>
  );

  const isOwner = user?.id === counter.owner_id;
  const days = daysSince(counter.started_at);
  const cheers = reactions.filter((r) => r.kind === "cheer").length;
  const shames = reactions.filter((r) => r.kind === "shame").length;
  const myCheer = !!user && reactions.some((r) => r.user_id === user.id && r.kind === "cheer");
  const myShame = !!user && reactions.some((r) => r.user_id === user.id && r.kind === "shame");

  async function doReset() {
    if (!counter || !user) return;
    const streak = daysSince(counter.started_at);
    const { error } = await supabase.from("counter_resets").insert({
      counter_id: counter.id, streak_days: streak, note: resetNote || null,
    });
    if (error) return toastError(error, "Couldn't reset");
    toast(`💀 Reset to 0. Best streak: ${Math.max(streak, counter.best_streak_days)} days.`);
    setResetNote(""); setResetOpen(false);
    load();
  }

  async function togglePublic(v: boolean) {
    if (!counter) return;
    const { error } = await supabase.from("counters").update({ is_public: v }).eq("id", counter.id);
    if (error) return toastError(error, "Couldn't update visibility");
    setCounter({ ...counter, is_public: v });
    toast.success(v ? "Counter is now public" : "Counter is private");
  }

  async function deleteCounter() {
    if (!counter) return;
    const { error } = await supabase.from("counters").delete().eq("id", counter.id);
    if (error) return toastError(error, "Couldn't delete");
    toast.success("Deleted");
    window.location.href = "/dashboard";
  }

  async function react(kind: "cheer" | "shame") {
    if (!user) return toast.error("Sign in to react");
    if (!counter?.is_public) return toast.error("This counter is private");
    const mine = reactions.find((r) => r.user_id === user.id && r.kind === kind);
    if (mine) {
      const { error } = await supabase.from("counter_reactions").delete().eq("id", mine.id);
      if (error) return toastError(error, "Couldn't remove reaction");
    } else {
      const { error } = await supabase
        .from("counter_reactions")
        .insert({ counter_id: counter.id, user_id: user.id, kind });
      if (error) return toastError(error, "Couldn't react");
    }
    load();
  }

  async function copyShare() {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  }

  return (
    <div className="min-h-screen bg-hero">
      <Navbar />
      <main className="container max-w-3xl py-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3 text-sm">
            <Badge variant="secondary" className="rounded-full">{counter.category}</Badge>
            {ownerHandle && <Link to={`/u/${ownerHandle}`} className="text-muted-foreground hover:text-foreground">@{ownerHandle}</Link>}
            <span className="text-muted-foreground inline-flex items-center gap-1">
              {counter.is_public ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {counter.is_public ? "public" : "private"}
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-2 text-balance">{counter.title}</h1>
          {counter.description && <p className="text-muted-foreground max-w-xl mx-auto">{counter.description}</p>}
        </div>

        <Card className="p-10 shadow-pop mb-6">
          <BigDayDisplay startedAt={counter.started_at} size="lg" />
          <div className="mt-8">
            <MilestoneRow days={days} />
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span>Best: <span className="font-mono-num font-bold text-foreground">{Math.max(days, counter.best_streak_days)}</span> days</span>
            <span>Started: {formatDistanceToNow(new Date(counter.started_at), { addSuffix: true })}</span>
          </div>

          {isOwner && (
            <div className="mt-8 flex justify-center">
              <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
                <AlertDialogTrigger asChild>
                  <Button size="lg" variant="destructive" className="px-8">💀 I failed today</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset to zero?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You'll lose your current {days}-day streak. Your best ever ({Math.max(days, counter.best_streak_days)} days) stays recorded.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea placeholder="What happened? (optional)" value={resetNote} onChange={(e) => setResetNote(e.target.value)} rows={3} />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={doReset}>Reset counter</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </Card>

        {counter.is_public && (
          <Card className="p-5 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Button variant={myCheer ? "default" : "outline"} onClick={() => react("cheer")} className="gap-1.5">
                  <Flame className="h-4 w-4" /> Cheer · {cheers}
                </Button>
                <Button variant={myShame ? "default" : "outline"} onClick={() => react("shame")} className="gap-1.5">
                  <Skull className="h-4 w-4" /> Shame · {shames}
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={copyShare}><Share2 className="h-4 w-4 mr-1.5" />Share</Button>
            </div>
          </Card>
        )}

        {isOwner && (
          <Card className="p-5 mb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Switch checked={counter.is_public} onCheckedChange={togglePublic} id="pub" />
                <label htmlFor="pub" className="text-sm font-medium">Public counter</label>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4 mr-1.5" />Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this counter?</AlertDialogTitle>
                    <AlertDialogDescription>This permanently removes the counter and all its history.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteCounter}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="font-display text-xl font-bold mb-4">History</h2>
          {resets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fails logged. Yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {resets.map((r) => (
                <li key={r.id} className="py-3 flex items-start gap-4">
                  <div className="font-mono-num font-bold text-2xl text-accent w-16 shrink-0">{r.streak_days}d</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(r.reset_at), { addSuffix: true })}</div>
                    {r.note && <div className="text-sm mt-0.5 text-foreground">{r.note}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
