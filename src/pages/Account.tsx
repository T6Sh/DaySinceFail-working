import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { isAllowedSignupEmail, ALLOWED_EMAIL_HINT } from "@/lib/email";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

type VerifyState = "idle" | "checking" | "ready" | "pending";

export default function Account() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [statusMsg, setStatusMsg] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) nav("/auth", { replace: true });
  }, [loading, user, nav]);

  // Show pending banner if Supabase has a pending email change.
  useEffect(() => {
    if (!user) return;
    // Supabase exposes `new_email` on the user when an email change is pending confirmation.
    const pending = (user as any).new_email as string | undefined;
    if (pending) {
      setVerifyState("pending");
      setStatusMsg(
        `Pending: confirm the link sent to ${pending} to finalize your new email.`
      );
    } else {
      setVerifyState("ready");
      setStatusMsg(`Verified email: ${user.email}`);
    }
  }, [user]);

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === user.email?.toLowerCase()) {
      return toast.error("That's already your email");
    }
    if (!isAllowedSignupEmail(trimmed)) {
      setVerifyState("ready");
      setStatusMsg(`Verified email: ${user.email}`);
      return toast.error(ALLOWED_EMAIL_HINT);
    }
    setBusy(true);
    setVerifyState("checking");
    setStatusMsg("Sending confirmation link…");
    const { error } = await supabase.auth.updateUser(
      { email: trimmed },
      { emailRedirectTo: `${window.location.origin}/account` }
    );
    setBusy(false);
    if (error) {
      setVerifyState("ready");
      setStatusMsg(`Verified email: ${user.email}`);
      return toast.error(error.message);
    }
    setVerifyState("pending");
    setStatusMsg(
      `Pending: confirm the link sent to ${trimmed} to finalize your new email.`
    );
    setNewEmail("");
    toast.success("Confirmation email sent");
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-20 text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container max-w-xl py-10">
        <h1 className="font-display text-3xl font-bold mb-6">Account</h1>

        <Card className="p-6 mb-6">
          <div className="flex items-start gap-3">
            {verifyState === "checking" ? (
              <Loader2 className="h-5 w-5 mt-0.5 animate-spin text-muted-foreground" />
            ) : verifyState === "pending" ? (
              <Mail className="h-5 w-5 mt-0.5 text-accent" />
            ) : (
              <CheckCircle2 className="h-5 w-5 mt-0.5 text-accent" />
            )}
            <div>
              <div className="font-medium">
                {verifyState === "pending"
                  ? "Email change pending"
                  : verifyState === "checking"
                  ? "Working…"
                  : "Email verified"}
              </div>
              <div className="text-sm text-muted-foreground">{statusMsg}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl font-bold mb-1">Change email</h2>
          <p className="text-sm text-muted-foreground mb-4">{ALLOWED_EMAIL_HINT}</p>
          <form onSubmit={changeEmail} className="space-y-4">
            <div>
              <Label htmlFor="new-email">New email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@gmail.com"
                required
              />
            </div>
            <Button disabled={busy || !newEmail.trim()}>
              {busy ? "Sending…" : "Send confirmation"}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
