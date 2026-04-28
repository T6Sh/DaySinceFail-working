import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User as UserIcon, AtSign, Mail, LogOut } from "lucide-react";

type Profile = { username: string; display_name: string | null };

export default function Account() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!loading && !user) nav("/auth", { replace: true });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
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

  const rows = [
    { icon: UserIcon, label: "Name", value: profile?.display_name || "—" },
    { icon: AtSign, label: "Username", value: profile?.username ? `@${profile.username}` : "—" },
    { icon: Mail, label: "Email", value: user.email || "—" },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container max-w-xl py-10">
        <h1 className="font-display text-3xl font-bold mb-6">Account</h1>

        <Card className="p-6 mb-6 divide-y divide-border">
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
      </main>
    </div>
  );
}
