import { Link, useRouter } from "@tanstack/react-router";
import { GraduationCap, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-hero-gradient text-ink-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-sm font-bold">Dropout Risk Predictor</span>
            <span className="block text-[11px] font-medium tracking-wide text-muted-foreground">
              SEOK Early Warning System
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/predict">Predict</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/bulk">Bulk CSV</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/students">Students</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/insights">Insights</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/template">Template</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  router.navigate({ to: "/auth" });
                }}
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link to="/auth">Staff sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
