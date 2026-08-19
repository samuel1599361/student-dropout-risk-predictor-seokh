import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { GraduationCap, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { HelpPanel } from "@/components/HelpPanel";

const NAV_LINKS = [

  { to: "/predict", label: "Predict" },
  { to: "/bulk", label: "Bulk CSV" },
  { to: "/students", label: "Students" },
  { to: "/insights", label: "Insights" },
  { to: "/template", label: "Template" },
] as const;

export function AppHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-hero-gradient text-ink-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-sm font-bold">
              Dropout Risk Predictor
            </span>
            <span className="block truncate text-[11px] font-medium tracking-wide text-muted-foreground">
              SEOK Early Warning System
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {user ? (
            <>
              {NAV_LINKS.map((link) => (
                <Button key={link.to} variant="ghost" size="sm" asChild>
                  <Link to={link.to}>{link.label}</Link>
                </Button>
              ))}
              <HelpPanel />
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="size-4" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <HelpPanel />
              <Button size="sm" asChild>
                <Link to="/auth">Staff sign in</Link>
              </Button>
            </>
          )}
        </nav>

        {/* Mobile nav */}

        <div className="flex items-center gap-2 lg:hidden">
          {!user && (
            <>
              <HelpPanel />
              <Button size="sm" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
            </>
          )}
          {user && (
            <>
              <HelpPanel />
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Open menu">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[16rem] p-6">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground">
                    Navigation
                  </p>
                  <nav className="mt-4 flex flex-col gap-1">
                    {NAV_LINKS.map((link) => (
                      <Button
                        key={link.to}
                        variant="ghost"
                        className="justify-start"
                        asChild
                        onClick={() => setOpen(false)}
                      >
                        <Link to={link.to}>{link.label}</Link>
                      </Button>
                    ))}
                    <HelpPanel full />
                  </nav>
                  <Button variant="outline" className="mt-6 w-full" onClick={handleSignOut}>
                    <LogOut className="size-4" />
                    Sign out
                  </Button>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>
    </header>

  );
}
