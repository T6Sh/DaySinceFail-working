import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { CounterCard } from "@/components/CounterCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { Plus } from "lucide-react";

type Counter = {
  id: string;
  title: string;
  category: string;
  started_at: string;
  best_streak_days: number;
  is_public: boolean;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [counters, setCounters] = useState<Counter[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<{ username: string } | null>(null);

  // form
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  async function load() {
    if (!user) return;
    const [{ data: cs }, { data: pr }] = await Promise.all([
      supabase.from("counters").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
    ]);
    setCounters((cs ?? []) as Counter[]);
    setProfile(pr);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("counters").insert({
      owner_id: user.id,
      title,
      category: category || "general",
      description: description || null,
      is_public: isPublic,
    });
    if (error) return toastError(error, "Couldn't create counter");
    toast.success("Counter created");
    setOpen(false);
    setTitle(""); setCategory("general"); setDescription(""); setIsPublic(false);
    load();
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-10">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl font-bold">Your counters</h1>
            <p className="text-muted-foreground mt-1">
              {profile?.username && <>@{profile.username} · </>}
              Track every slip-up. Make them public for accountability.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg"><Plus className="h-4 w-4 mr-1.5" />New counter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New counter</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Days since I skipped the gym" required />
                </div>
                <div>
                  <Label htmlFor="cat">Category</Label>
                  <Input id="cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="fitness, diet, productivity…" />
                </div>
                <div>
                  <Label htmlFor="desc">Description (optional)</Label>
                  <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium text-sm">Make public</div>
                    <div className="text-xs text-muted-foreground">Show on the leaderboard. Others can react.</div>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>
                <Button className="w-full" type="submit">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : counters.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <h3 className="font-display text-xl font-semibold mb-2">No counters yet</h3>
            <p className="text-muted-foreground mb-4">Create your first counter to start tracking.</p>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New counter</Button>
          </Card>
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
                isPublic={c.is_public}
              />
            ))}
          </div>
        )}

        {profile?.username && (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Public profile: <Link to={`/u/${profile.username}`} className="text-accent font-medium hover:underline">/u/{profile.username}</Link>
          </p>
        )}
      </main>
    </div>
  );
}
