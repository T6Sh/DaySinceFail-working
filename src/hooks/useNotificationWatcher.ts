// Polls for new followers and streak resets while the app is open,
// and fires local notifications. No DB changes required.
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { pushNotif } from "@/lib/notifications";

const SEEN_FOLLOW_KEY = (uid: string) => `notif:lastFollow:${uid}`;
const SEEN_RESET_KEY = (uid: string) => `notif:lastReset:${uid}`;
const POLL_MS = 45_000;

export function useNotificationWatcher() {
  const { user } = useAuth();
  const initRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async (initial = false) => {
      try {
        const lastFollow = localStorage.getItem(SEEN_FOLLOW_KEY(user.id));
        const lastReset = localStorage.getItem(SEEN_RESET_KEY(user.id));

        // New followers
        const followQ = supabase
          .from("follows")
          .select("id, follower_id, created_at")
          .eq("followee_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        const { data: follows } = await followQ;

        if (follows && follows.length > 0) {
          if (!initial && lastFollow) {
            const fresh = follows.filter((f) => f.created_at > lastFollow);
            for (const f of fresh.reverse()) {
              const { data: prof } = await supabase
                .from("profiles")
                .select("username, display_name")
                .eq("id", f.follower_id)
                .maybeSingle();
              const name = prof?.display_name || prof?.username || "Someone";
              await pushNotif(user.id, {
                kind: "follow",
                title: "New follower",
                body: `${name} followed you`,
                url: prof?.username ? `/u/${prof.username}` : undefined,
              });
            }
          }
          localStorage.setItem(SEEN_FOLLOW_KEY(user.id), follows[0].created_at);
        } else if (initial) {
          localStorage.setItem(SEEN_FOLLOW_KEY(user.id), new Date().toISOString());
        }

        // Streak resets on my counters
        const { data: myCounters } = await supabase
          .from("counters")
          .select("id, title")
          .eq("owner_id", user.id);
        const ids = (myCounters || []).map((c) => c.id);
        if (ids.length > 0) {
          const { data: resets } = await supabase
            .from("counter_resets")
            .select("id, counter_id, reset_at")
            .in("counter_id", ids)
            .order("reset_at", { ascending: false })
            .limit(10);
          if (resets && resets.length > 0) {
            if (!initial && lastReset) {
              const fresh = resets.filter((r) => r.reset_at > lastReset);
              const titleById = new Map(myCounters!.map((c) => [c.id, c.title]));
              for (const r of fresh.reverse()) {
                await pushNotif(user.id, {
                  kind: "streak_reset",
                  title: "Streak reset",
                  body: `Your "${titleById.get(r.counter_id) || "counter"}" streak was reset`,
                  url: `/counter/${r.counter_id}`,
                });
              }
            }
            localStorage.setItem(SEEN_RESET_KEY(user.id), resets[0].reset_at);
          } else if (initial) {
            localStorage.setItem(SEEN_RESET_KEY(user.id), new Date().toISOString());
          }
        }
      } catch {
        /* ignore polling errors */
      }
    };

    if (!initRef.current) {
      initRef.current = true;
      tick(true);
    }
    timer = setInterval(() => {
      if (!cancelled) tick(false);
    }, POLL_MS);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [user]);
}
