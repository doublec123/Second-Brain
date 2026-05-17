import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Dashboard } from "@/pages/Dashboard";
import { Capture } from "@/pages/Capture";
import { Library } from "@/pages/Library";
import { Favorites } from "@/pages/Favorites";
import { Categories } from "@/pages/Categories";
import { ItemDetail } from "@/pages/ItemDetail";
import { SemanticSearch } from "@/pages/SemanticSearch";
import { Login } from "@/pages/Login";
import { Admin } from "@/pages/Admin";
import KnowledgeGraph from "@/pages/KnowledgeGraph";
import { useGetMe } from "@/api/authHooks";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ErrorBoundary } from "@/components/ErrorBoundary";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// Auth guard as a wrapper that redirects without DOM conflicts
function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { data: user, isLoading, isFetching } = useGetMe();
  const [, setLocation] = useLocation();

  // Only consider "loading" if we have no data yet at all
  const stillLoading = isLoading && !user;

  useEffect(() => {
    if (stillLoading) return;
    if (!user) {
      setLocation("/login");
    } else if (adminOnly && user.role !== "admin") {
      setLocation("/");
    }
  }, [user, stillLoading, adminOnly, setLocation]);

  if (stillLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" suppressHydrationWarning>
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  if (adminOnly && user.role !== "admin") return null;

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />

      <Route path="/" component={() => <AuthGuard><Dashboard /></AuthGuard>} />
      <Route path="/capture" component={() => <AuthGuard><Capture /></AuthGuard>} />
      <Route path="/library" component={() => <AuthGuard><Library /></AuthGuard>} />
      <Route path="/favorites" component={() => <AuthGuard><Favorites /></AuthGuard>} />
      <Route path="/categories" component={() => <AuthGuard><Categories /></AuthGuard>} />
      <Route path="/item/:id">
        {(params) => (
          <AuthGuard>
            <ItemDetail />
          </AuthGuard>
        )}
      </Route>
      <Route path="/search" component={() => <AuthGuard><SemanticSearch /></AuthGuard>} />
      <Route path="/graph" component={() => <AuthGuard><KnowledgeGraph /></AuthGuard>} />
      <Route path="/admin" component={() => <AuthGuard adminOnly><Admin /></AuthGuard>} />

      <Route component={NotFound} />
    </Switch>
  );
}

import { ThemeProvider } from "@/components/ThemeProvider";

function App() {
  useEffect(() => {
    // Auto login on return: check for existing session and skip login if found
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && window.location.pathname === "/login") {
        window.location.replace("/");
      }
    };
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, _session) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
          // Refresh the "me" query whenever the session changes
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="knowledge-weaver-theme">
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
