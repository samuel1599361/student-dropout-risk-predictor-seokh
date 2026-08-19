import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff sign in — Dropout Risk Predictor SEOK" },
      {
        name: "description",
        content:
          "Sign in or create a school staff account to run student dropout risk predictions on the SEOK Early Warning System.",
      },
      { property: "og:title", content: "Staff sign in — Dropout Risk Predictor SEOK" },
      {
        property: "og:description",
        content: "Secure access for school staff to the SEOK dropout Early Warning System.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/predict" });
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/predict`,
            data: { full_name: fullName, school },
          },
        });
        if (error) throw error;
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          toast.success("Account created. Please check your email to confirm, then sign in.");
          setMode("signin");
          return;
        }
        toast.success("Welcome to SEOK Early Warning System");
        router.navigate({ to: "/predict" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        router.navigate({ to: "/predict" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try email and password.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    router.navigate({ to: "/predict" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-hero-gradient p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2.5 text-ink-foreground">
          <span className="flex size-9 items-center justify-center rounded-lg bg-ink-foreground/15">
            <GraduationCap className="size-5" />
          </span>
          <span className="font-display font-bold">SEOK Early Warning System</span>
        </Link>
        <div>
          <h1 className="max-w-md text-balance-tight text-4xl font-bold text-ink-foreground">
            Identify at-risk students before they disappear.
          </h1>
          <p className="mt-5 max-w-md text-ink-foreground/75">
            A tuned Gradient Boosting classifier scores each student on eight evidence-based
            factors and hands your team an explained, actionable case report.
          </p>
        </div>
        <p className="text-xs text-ink-foreground/60">
          Access is restricted to authorised school staff.
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/70 shadow-elevated">
          <CardHeader>
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <LockKeyhole className="size-5" />
            </span>
            <CardTitle className="mt-3 text-2xl">
              {mode === "signin" ? "Staff sign in" : "Create staff account"}
            </CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Sign in to run dropout risk predictions."
                : "Register your school staff account to get started."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Samuel Okhale"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="school">School</Label>
                    <Input
                      id="school"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="Government Secondary School"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
              Continue with Google
            </Button>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              <Link to="/" className="underline underline-offset-4">
                Back to overview
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
