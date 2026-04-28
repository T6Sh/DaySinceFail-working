import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy } from "lucide-react";

export function Navbar() {
  const { user } = useAuth();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-foreground">
            ⚠
          </span>
          DaysSinceFail
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link to="/leaderboard" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <Trophy className="h-4 w-4" /> Leaderboard
          </Link>
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => nav("/dashboard")}>
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => nav("/account")}>
                Account
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => nav("/auth")}>Sign in</Button>
              <Button size="sm" onClick={() => nav("/auth?mode=signup")}>Get started</Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
