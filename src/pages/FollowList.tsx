import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Mode = "followers" | "following";
type Row = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

const PAGE_SIZE = 20;

export function FollowList({ mode }: { mode: Mode }) {
  const { username } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!username) return;
      setLoading(true);
      const { data: p } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (!p) {
        setProfileMissing(true);
        setLoading(false);
        return;
      }
      setProfileId(p.id);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const idCol = mode === "followers" ? "follower_id" : "followee_id";
      const filterCol = mode === "followers" ? "followee_id" : "follower_id";

      const { data: edges, count } = await supabase
        .from("follows")
        .select(`${idCol}, created_at`, { count: "exact" })
        .eq(filterCol, p.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      setTotal(count ?? 0);

      const ids = (edges ?? []).map((e: any) => e[idCol]).filter(Boolean) as string[];
      if (ids.length === 0) {
        setRows([]);
      } else {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", ids);
        // Preserve follow order
        const byId = new Map((profiles ?? []).map((r: any) => [r.id, r]));
        const ordered = ids.map((i) => byId.get(i)).filter(Boolean) as Row[];
        setRows(ordered);
      }
      setLoading(false);
    })();
  }, [username, mode, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const heading = mode === "followers" ? "Followers" : "Following";

  function setPage(n: number) {
    const next = new URLSearchParams(params);
    if (n <= 1) next.delete("page");
    else next.set("page", String(n));
    setParams(next, { replace: false });
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container max-w-2xl py-10">
        <Link to={`/u/${username}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← @{username}
        </Link>
        <h1 className="font-display text-3xl font-bold mt-2 mb-6">
          {heading}
          {!loading && <span className="text-muted-foreground font-normal text-xl ml-2">{total}</span>}
        </h1>

        {profileMissing ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">User not found.</p>
          </Card>
        ) : loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-muted-foreground">
              {mode === "followers"
                ? "No followers yet."
                : "Not following anyone yet."}
            </p>
          </Card>
        ) : (
          <>
            <ul className="divide-y divide-border rounded-lg border border-border/60 bg-card">
              {rows.map((r) => {
                const initials =
                  (r.display_name ?? r.username)
                    .split(" ")
                    .map((s) => s[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "?";
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => nav(`/u/${r.username}`)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-muted/40 text-left transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={r.avatar_url ?? undefined} alt={r.username} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{r.display_name ?? r.username}</div>
                        <div className="text-sm text-muted-foreground truncate">@{r.username}</div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function Followers() {
  return <FollowList mode="followers" />;
}

export function Following() {
  return <FollowList mode="following" />;
}
