import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { User as UserIcon, AtSign, Mail, LogOut, Bell, Trash2, AlertTriangle } from "lucide-react";
import {
  clearAll as clearAllNotifs,
  getNotifPrefs,
  setNotifPrefs,
  NotifPrefs,
} from "@/lib/notifications";

type Profile = { username: string; display_name: string | null };

export default function Account() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prefs, setPrefs] = useState<NotifPrefs>({ follow: true, streak_reset: true });
  const [wiping, setWiping] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav("/auth", { replace: true });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    setPrefs(getNotifPrefs(user.id));
    supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data as Profile | null));
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-20 text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const updatePref = (key: keyof NotifPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setNotifPrefs(user.id, next);
  };

  const handleClearData = async () => {
    if (!user) return;
    setWiping(true);
    try {
      // Get my counters to cascade-delete dependents
      const { data: myCounters } = await supabase
        .from("counters")
        .select("id")
        .eq("owner_id", user.id);
      const counterIds = (myCounters || []).map((c) => c.id);

      if (counterIds.length > 0) {
        await supabase.from("counter_resets").delete().in("counter_id", counterIds);
        await supabase.from("counter_reactions").delete().in("counter_id", counterIds);
      }
      // Reactions I made on others' counters
      await supabase.from("counter_reactions").delete().eq("user_id", user.id);
      // My counters
      await supabase.from("counters").delete().eq("owner_id", user.id);
      // Follows (both directions where I'm involved as follower)
      await supabase.from("follows").delete().eq("follower_id", user.id);
      await supabase.from("follows").delete().eq("followee_id", user.id);
      // Blocks I created
      await supabase.from("blocks").delete().eq("blocker_id", user.id);

      // Local notification history + prefs
      clearAllNotifs(user.id);

      toast({ title: "Data cleared", description: "All your data has been deleted." });
      await signOut();
      nav("/");
    } catch (e: any) {
      toast({
        title: "Couldn't clear all data",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setWiping(false);
    }
  };

  const rows = [
    { icon: UserIcon, label: "Name", value: profile?.display_name || "—" },
    { icon: AtSign, label: "Username", value: profile?.username ? `@${profile.username}` : "—" },
    { icon: Mail, label: "Email", value: user.email || "—" },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container max-w-xl py-10 space-y-6">
        <h1 className="font-display text-3xl font-bold">Account</h1>

        <Card className="p-6 divide-y divide-border">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="font-medium truncate">{value}</div>
              </div>
            </div>
          ))}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="pref-follow" className="font-medium">New follower alerts</Label>
                <p className="text-xs text-muted-foreground">Notify me when someone follows me.</p>
              </div>
              <Switch
                id="pref-follow"
                checked={prefs.follow}
                onCheckedChange={(v) => updatePref("follow", v)}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="pref-reset" className="font-medium">Streak reset alerts</Label>
                <p className="text-xs text-muted-foreground">Notify me when one of my streaks resets.</p>
              </div>
              <Switch
                id="pref-reset"
                checked={prefs.streak_reset}
                onCheckedChange={(v) => updatePref("streak_reset", v)}
              />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                clearAllNotifs(user.id);
                toast({ title: "Notification history cleared" });
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear notification history
            </Button>
          </div>
        </Card>

        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            await signOut();
            nav("/");
          }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>

        <Card className="p-6 border-destructive/40">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="font-semibold">Danger zone</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete all your counters, follows, reactions, blocks and local notification history. This cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" disabled={wiping}>
                <Trash2 className="h-4 w-4 mr-2" />
                {wiping ? "Clearing…" : "Clear all my data"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all your data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove your counters, streak history, follows, reactions, blocks and notification history. You will be signed out. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleClearData}
                >
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </main>
    </div>
  );
}
