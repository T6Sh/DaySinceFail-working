import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { isAllowedSignupEmail, ALLOWED_EMAIL_HINT } from "@/lib/email";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function Auth() {
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifyState, setVerifyState] = useState<"idle" | "checking" | "ready">("idle");
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!user) return;
    // After signup the trigger creates a profiles row. Poll briefly so the
    // user gets a clear "Profile ready" confirmation before we redirect.
    let cancelled = false;
    setVerifyState("checking");
    (async () => {
      for (let i = 0; i < 10 && !cancelled; i++) {
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (data) {
          setVerifyState("ready");
          // brief pause so the user sees the success state
          setTimeout(() => !cancelled && nav("/dashboard?onboarding=1", { replace: true }), 600);
          return;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      // Trigger should always succeed; if not, still continue.
      if (!cancelled) nav("/dashboard?onboarding=1", { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!isAllowedSignupEmail(email)) {
          throw new Error(ALLOWED_EMAIL_HINT);
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard?onboarding=1`,
            data: { username },
          },
        });
        if (error) throw error;
        toast.success("Account created — welcome!");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your email for a reset link");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const { lovable } = await import("@/integrations/lovable/index");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
  }

  return (
    <div className="min-h-screen bg-hero">
      <Navbar />
      <div className="container max-w-md py-16">
        <Card className="p-8 shadow-pop border-border/60">
          <h1 className="font-display text-3xl font-bold mb-1">
            {mode === "signup" ? "Create account" : mode === "forgot" ? "Reset password" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signup" ? "Start counting your slip-ups." : mode === "forgot" ? "We'll email you a link." : "Pick up where you left off."}
          </p>

          {mode !== "forgot" && (
            <>
              <Button variant="outline" className="w-full mb-4" onClick={google} type="button">
                Continue with Google
              </Button>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="yourhandle" minLength={3} required />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode !== "forgot" && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              </div>
            )}
            <Button className="w-full" disabled={busy}>
              {busy ? "Working…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-center text-sm text-muted-foreground">
            {mode === "signin" && (
              <>
                <button onClick={() => setMode("signup")} className="hover:text-foreground">No account? <span className="text-accent font-medium">Sign up</span></button>
                <button onClick={() => setMode("forgot")} className="hover:text-foreground">Forgot password?</button>
              </>
            )}
            {mode === "signup" && (
              <button onClick={() => setMode("signin")} className="hover:text-foreground">Already have an account? <span className="text-accent font-medium">Sign in</span></button>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("signin")} className="hover:text-foreground">Back to sign in</button>
            )}
          </div>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/" className="hover:text-foreground">← Back home</Link>
        </p>
      </div>
    </div>
  );
}
