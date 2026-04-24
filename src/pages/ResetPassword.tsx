import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    // Supabase auto-handles the recovery hash; once session exists we're ready.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    nav("/dashboard");
  }

  return (
    <div className="min-h-screen bg-hero grid place-items-center px-4">
      <Card className="w-full max-w-md p-8 shadow-pop">
        <h1 className="font-display text-2xl font-bold mb-2">Set a new password</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {ready ? "Choose something memorable." : "Verifying reset link…"}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="pw">New password</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required disabled={!ready} />
          </div>
          <Button className="w-full" disabled={busy || !ready}>{busy ? "Saving…" : "Update password"}</Button>
        </form>
      </Card>
    </div>
  );
}
