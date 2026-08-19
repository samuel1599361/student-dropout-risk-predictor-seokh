import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  LockKeyhole,
  MailCheck,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { cn } from "@/lib/utils";

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

type Mode = "signin" | "signup" | "forgot";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address")
  .email("That doesn't look like a valid email address")
  .max(255, "Email is too long");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be less than 72 characters");

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Email or password is incorrect. Check your details, or create an account if you're new.";
  if (m.includes("email not confirmed"))
    return "Your email isn't confirmed yet. Open the confirmation link we emailed you.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with this email already exists — switch to Sign in instead.";
  if (m.includes("weak") || m.includes("pwned"))
    return "That password appears in known data breaches. Please pick a longer, unique password (try 3 random words plus a number).";
  if (m.includes("password should be at least"))
    return "Please choose a password with at least 8 characters.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "We couldn't reach the server. Check your connection and try again.";
  return message;
}

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string; form?: string }>({});
  const [sentEmail, setSentEmail] = useState<null | "confirm" | "reset">(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/predict" });
    });
  }, [router]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setSentEmail(null);
  };

  const validate = () => {
    const next: { email?: string; password?: string; fullName?: string } = {};
    const e = emailSchema.safeParse(email);
    if (!e.success) next.email = e.error.issues[0]!.message;
    if (mode !== "forgot") {
      const p = passwordSchema.safeParse(password);
      if (!p.success) next.password = p.error.issues[0]!.message;
    }
    if (mode === "signup" && fullName.trim().length < 2)
      next.fullName = "Please enter your full name";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    const cleanEmail = email.trim();
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSentEmail("reset");
        toast.success("Password reset link sent");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/predict`,
            data: { full_name: fullName.trim(), school: school.trim() },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Welcome to the SEOK Early Warning System");
          router.navigate({ to: "/predict" });
          return;
        }
        setSentEmail("confirm");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;
      toast.success("Signed in");
      router.navigate({ to: "/predict" });
    } catch (err) {
      const message = friendlyError(err instanceof Error ? err.message : "Authentication failed");
      setErrors({ form: message });
      toast.error(message);
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
      const message = "Google sign-in didn't complete. You can use email and password instead.";
      setErrors({ form: message });
      toast.error(message);
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    router.navigate({ to: "/predict" });
  };

  const title =
    mode === "signin" ? "Staff sign in" : mode === "signup" ? "Create staff account" : "Reset password";
  const subtitle =
    mode === "signin"
      ? "Sign in to run dropout risk predictions."
      : mode === "signup"
        ? "Takes under a minute — name, email and a password."
        : "We'll email you a secure link to set a new password.";

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
          <ul className="mt-8 space-y-2 text-sm text-ink-foreground/80">
            {[
              "Single-student and bulk CSV screening",
              "Explained risk drivers and interventions",
              "Branded, downloadable PDF reports",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="size-4" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-ink-foreground/60">
          Access is restricted to authorised school staff.
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/70 shadow-elevated">
          <CardHeader>
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              {sentEmail ? <MailCheck className="size-5" /> : <LockKeyhole className="size-5" />}
            </span>
            <CardTitle className="mt-3 text-2xl">
              {sentEmail ? "Check your email" : title}
            </CardTitle>
            <CardDescription>
              {sentEmail
                ? sentEmail === "confirm"
                  ? `We sent a confirmation link to ${email.trim()}. Click it to activate your account, then sign in.`
                  : `We sent a password reset link to ${email.trim()}. It expires in 60 minutes.`
                : subtitle}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sentEmail ? (
              <div className="space-y-3">
                <Button className="w-full" onClick={() => switchMode("signin")}>
                  Back to sign in
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  No email after a few minutes? Check your spam folder or{" "}
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() => setSentEmail(null)}
                  >
                    try a different address
                  </button>
                  .
                </p>
              </div>
            ) : (
              <>
                {mode !== "forgot" && (
                  <div
                    role="tablist"
                    aria-label="Authentication mode"
                    className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
                  >
                    {(["signin", "signup"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        role="tab"
                        aria-selected={mode === m}
                        onClick={() => switchMode(m)}
                        className={cn(
                          "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          mode === m
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {m === "signin" ? "Sign in" : "Sign up"}
                      </button>
                    ))}
                  </div>
                )}

                {errors.form && (
                  <p
                    role="alert"
                    className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {errors.form}
                  </p>
                )}

                <form onSubmit={submit} noValidate className="mt-6 space-y-4">
                  {mode === "signup" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName">Full name</Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Samuel Okhale"
                          maxLength={100}
                          aria-invalid={!!errors.fullName}
                        />
                        {errors.fullName && (
                          <p className="text-xs text-destructive">{errors.fullName}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="school">
                          School <span className="text-muted-foreground">(optional)</span>
                        </Label>
                        <Input
                          id="school"
                          value={school}
                          onChange={(e) => setSchool(e.target.value)}
                          placeholder="Government Secondary School"
                          maxLength={120}
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
                      placeholder="you@school.edu.ng"
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>

                  {mode !== "forgot" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {mode === "signin" && (
                          <button
                            type="button"
                            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                            onClick={() => switchMode("forgot")}
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete={mode === "signin" ? "current-password" : "new-password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pr-10"
                          aria-invalid={!!errors.password}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {errors.password ? (
                        <p className="text-xs text-destructive">{errors.password}</p>
                      ) : (
                        mode === "signup" && (
                          <p className="text-xs text-muted-foreground">
                            Use at least 8 characters.
                          </p>
                        )
                      )}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    {mode === "signin"
                      ? "Sign in"
                      : mode === "signup"
                        ? "Create account"
                        : "Send reset link"}
                  </Button>
                </form>

                {mode === "forgot" ? (
                  <p className="mt-5 text-center text-sm text-muted-foreground">
                    <button
                      type="button"
                      className="underline underline-offset-4"
                      onClick={() => switchMode("signin")}
                    >
                      Back to sign in
                    </button>
                  </p>
                ) : (
                  <>
                    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="h-px flex-1 bg-border" />
                      or
                      <span className="h-px flex-1 bg-border" />
                    </div>

                    <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
                      Continue with Google
                    </Button>

                    <p className="mt-5 text-center text-sm text-muted-foreground">
                      {mode === "signin" ? (
                        <>
                          New here?{" "}
                          <button
                            type="button"
                            className="font-medium text-foreground underline underline-offset-4"
                            onClick={() => switchMode("signup")}
                          >
                            Create a staff account
                          </button>
                        </>
                      ) : (
                        <>
                          Already registered?{" "}
                          <button
                            type="button"
                            className="font-medium text-foreground underline underline-offset-4"
                            onClick={() => switchMode("signin")}
                          >
                            Sign in instead
                          </button>
                        </>
                      )}
                    </p>
                  </>
                )}
              </>
            )}

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
