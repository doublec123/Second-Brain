import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLogin, useSignup, useGetMe } from "@/api/authHooks";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Sparkles, LogIn, UserPlus } from "lucide-react";

export function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const loginMutation = useLogin();
  const signupMutation = useSignup();
  const { data: user, isLoading: isUserLoading } = useGetMe();

  /** Defer swapping loading → form so extension-injected DOM can settle before React reconciliation */
  const [allowMainUi, setAllowMainUi] = useState(false);
  useEffect(() => {
    if (isUserLoading) {
      setAllowMainUi(false);
      return;
    }
    let canceled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!canceled) setAllowMainUi(true);
      });
    });
    return () => {
      canceled = true;
      cancelAnimationFrame(id);
    };
  }, [isUserLoading]);

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // After a successful auth call:
  // 1. Store the user in the /me cache so AuthGuard sees it immediately
  // 2. Navigate — no race condition
  const handleAuthSuccess = (user: any) => {
    if (!user) {
      // Case for signup pending email confirmation
      toast({ 
        title: "Check your email", 
        description: "Signup successful, please check your email for confirmation." 
      });
      return; 
    }

    // 1. Wipe any stale data from a previous session immediately
    queryClient.clear();
    // 2. Populate the /me query cache with the new logged-in user
    queryClient.setQueryData(["/api/auth/me"], user);
    toast({ title: `Welcome${user.name ? `, ${user.name}` : ""}!` });
    // Small tick to let React flush the cache update before routing
    setTimeout(() => setLocation("/library"), 50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      loginMutation.mutate(
        { data: { email, password } },
        {
          onSuccess: handleAuthSuccess,
          onError: (err: any) => {
            toast({
              title: "Login failed",
              description: err.message || "Invalid email or password.",
              variant: "destructive",
            });
          },
        }
      );
    } else {
      signupMutation.mutate(
        { data: { email, password, name } },
        {
          onSuccess: handleAuthSuccess,
          onError: (err: any) => {
            toast({
              title: "Signup failed",
              description: err.message || "Could not create account.",
              variant: "destructive",
            });
          },
        }
      );
    }
  };

  const isPending = loginMutation.isPending || signupMutation.isPending;

  const splash = (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (isUserLoading || !allowMainUi) {
    return (
      <ErrorBoundary>{splash}</ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary resetKey={`${String(isLogin)}-${String(allowMainUi)}`}>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div
          className="isolate max-w-sm w-full bg-card border border-card-border p-8 rounded-2xl shadow-2xl"
          data-enable-grammarly="false"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Knowledge Weaver
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLogin ? "Sign in to your account" : "Create a new account"}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            autoComplete="off"
            spellCheck={false}
            data-enable-grammarly="false"
          >
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  required
                  data-gramm="false"
                  data-gramm_editor="false"
                  data-enable-grammarly="false"
                  data-lpignore="true"
                  spellCheck={false}
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
                data-lpignore="true"
                spellCheck={false}
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
                data-lpignore="true"
                spellCheck={false}
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="w-full gap-2 mt-2"
              disabled={isPending}
            >
              <span className="inline-grid h-4 w-4 shrink-0 place-items-center [grid-template-areas:'stack']">
                {/* Keep icon nodes mounted; toggle visibility instead of swapping Lucide SVG trees (fewer reconcile conflicts with extensions) */}
                <span
                  className={cn(
                    "pointer-events-none [grid-area:stack] inline-flex size-4 items-center justify-center rounded-full border-2 border-primary-foreground border-t-transparent animate-spin transition-opacity duration-150",
                    isPending ? "opacity-100" : "opacity-0"
                  )}
                  aria-hidden
                />
                <LogIn
                  className={cn(
                    "[grid-area:stack] size-4 transition-opacity duration-150",
                    isPending || !isLogin ? "opacity-0 pointer-events-none" : "opacity-100"
                  )}
                  aria-hidden
                />
                <UserPlus
                  className={cn(
                    "[grid-area:stack] size-4 transition-opacity duration-150",
                    isPending || isLogin ? "opacity-0 pointer-events-none" : "opacity-100"
                  )}
                  aria-hidden
                />
              </span>
              <span>
                {isPending
                  ? isLogin
                    ? "Signing in..."
                    : "Creating account..."
                  : isLogin
                    ? "Sign In"
                    : "Create Account"}
              </span>
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setEmail("");
                setPassword("");
                setName("");
              }}
              className="text-sm text-primary hover:underline"
            >
              {isLogin
                ? "Don't have an account? Create one"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
