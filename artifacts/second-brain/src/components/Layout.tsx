import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Brain,
  LayoutDashboard,
  Plus,
  Library,
  Search,
  Tag,
  Star,
  Folder,
  ShieldCheck,
  LogOut,
  Share2,
  User as UserIcon,
  Menu,
  X,
} from "lucide-react";
import { useGetMe, useLogout } from "@/api/authHooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Scratchpad } from "./Scratchpad";
import { ThemeToggle } from "./ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/favorites", icon: Star, label: "Favorites" },
  { href: "/categories", icon: Folder, label: "Categories" },
  { href: "/capture", icon: Plus, label: "Capture" },
  { href: "/library", icon: Library, label: "Library" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/graph", icon: Share2, label: "Graph" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on navigation on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("auth_token");
        queryClient.clear(); // wipe all cached queries including /me
        toast({ title: "Signed out successfully" });
        setLocation("/login");
      },
    });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Brain className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground tracking-tight">
            Second Brain
          </span>
        </div>
        {!isMobile && <ThemeToggle />}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          return (
            <Link
              key={href}
              href={href}
              data-testid={`nav-${label.toLowerCase()}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
              {label}
            </Link>
          );
        })}

        {user?.role === "admin" && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 mt-4 border border-primary/20",
              location === "/admin" ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Admin Panel
          </Link>
        )}
      </nav>

      {/* Footer / User Profile */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-3">
        {user && (
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UserIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{user.name || "User"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
            {isMobile && <ThemeToggle />}
          </div>
        )}
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div 
      className="flex h-screen bg-background overflow-hidden"
      data-gramm="false"
      data-enable-grammarly="false"
      spellCheck="false"
      suppressHydrationWarning
    >
      {/* Sidebar for Desktop */}
      {!isMobile && (
        <aside className="w-60 shrink-0 border-r border-sidebar-border">
          <SidebarContent />
        </aside>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        {isMobile && (
          <header className="h-14 flex items-center justify-between px-4 border-b bg-sidebar shrink-0">
            <div className="flex items-center gap-2">
              <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="-ml-2">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64 border-r-0">
                  <SidebarContent />
                </SheetContent>
              </Sheet>
              <span className="font-semibold text-sm">Second Brain</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>
        )}

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
      <Scratchpad />
    </div>
  );
}
