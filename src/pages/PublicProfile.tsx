import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { CounterCard } from "@/components/CounterCard";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { daysSince } from "@/lib/streak";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Flame,
  Skull,
  Trophy,
  Activity,
  UserPlus,
  UserCheck,
  Link2,
  ArrowDownUp,
  Ban,
  ShieldOff,
  Heart,
} from "lucide-react";

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
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [sortDir, setSortDir] = useState<"oldest" | "newest">("oldest");
  const { user } = useAuth();

  const [followingCount, setFollowingCount] = useState(0);
  const [followsMe, setFollowsMe] = useState(false);
  const [iBlocked, setIBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [profileMissing, setProfileMissing] = useState(false);

  async function loadFollow(profileId: string) {
    const [{ count: followers }, { count: followingC }] = await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("followee_id", profileId),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profileId),
    ]);
    setFollowerCount(followers ?? 0);
    setFollowingCount(followingC ?? 0);
    if (user) {
      const [{ data: mine }, { data: theyMe }] = await Promise.all([
        supabase
          .from("follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("followee_id", profileId)
          .maybeSingle(),
        supabase
          .from("follows")
          .select("id")
          .eq("follower_id", profileId)
          .eq("followee_id", user.id)
          .maybeSingle(),
      ]);
      setIsFollowing(!!mine);
      setFollowsMe(!!theyMe);
    } else {
      setIsFollowing(false);
      setFollowsMe(false);
    }
  }

  async function loadBlockStatus(profileId: string) {
    if (!user) return setIBlocked(false);
    const { data } = await supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", profileId)
      .maybeSingle();
    setIBlocked(!!data);
  }

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
          .eq("is_public", true);
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
        await loadFollow(p.id);
      }
      setLoading(false);
    })();
  }, [username, user?.id]);

  const sortedCounters = useMemo(() => {
    const arr = [...counters];
    arr.sort((a, b) =>
      sortDir === "oldest"
        ? new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
        : new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
    return arr;
  }, [counters, sortDir]);

  async function toggleFollow() {
    if (!user) return toast.error("Sign in to follow");
    if (!profile) return;
    if (user.id === profile.id) return toast.error("You can't follow yourself");
    setFollowBusy(true);
    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followee_id", profile.id);
      setFollowBusy(false);
      if (error) return toastError(error, "Couldn't unfollow");
      setIsFollowing(false);
      setFollowerCount((n) => Math.max(0, n - 1));
      toast.success(`Unfollowed @${profile.username}`);
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: user.id, followee_id: profile.id });
      setFollowBusy(false);
      if (error) return toastError(error, "Couldn't follow");
      setIsFollowing(true);
      setFollowerCount((n) => n + 1);
      toast.success(`Following @${profile.username}`);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  }


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
            <header className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.username} />
                <AvatarFallback className="text-xl font-display">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-4xl font-bold leading-tight truncate">
                  {profile.display_name ?? profile.username}
                </h1>
                <p className="text-muted-foreground">
                  @{profile.username} · joined{" "}
                  {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-mono-num font-semibold text-foreground">{followerCount}</span>{" "}
                  {followerCount === 1 ? "follower" : "followers"}
                </p>
              </div>
              <div className="flex gap-2 sm:flex-col sm:items-end">
                {user && user.id !== profile.id && (
                  <Button
                    onClick={toggleFollow}
                    disabled={followBusy}
                    variant={isFollowing ? "outline" : "default"}
                    className="gap-1.5"
                  >
                    {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                )}
                <Button onClick={copyLink} variant="ghost" size="sm" className="gap-1.5">
                  <Link2 className="h-4 w-4" /> Copy profile link
                </Button>
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
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <h2 className="font-display text-xl font-bold">Counters</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortDir((d) => (d === "oldest" ? "newest" : "oldest"))}
                    className="gap-1.5"
                  >
                    <ArrowDownUp className="h-3.5 w-3.5" />
                    {sortDir === "oldest" ? "Oldest first" : "Newest first"}
                  </Button>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedCounters.map((c) => {
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
