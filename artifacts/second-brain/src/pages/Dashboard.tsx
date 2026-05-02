import { useListItems, useGetItemStats, getGetItemStatsQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { ItemCard } from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Link2, Image, FileText, Brain, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | undefined;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground h-8 flex items-center">
          {value !== undefined ? value : <Skeleton className="h-7 w-10" />}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: stats } = useGetItemStats({
    query: { queryKey: getGetItemStatsQueryKey() },
  });
  const { data: items, isLoading: itemsLoading } = useListItems();

  const recentItems = items?.slice(0, 6) ?? [];

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Knowledge Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your second brain — always learning, always ready.
            </p>
          </div>
          <Button
            data-testid="button-capture-new"
            className="gap-2"
            onClick={() => setLocation("/capture")}
          >
            <Plus className="w-4 h-4" />
            Capture
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Items"
            value={stats?.total}
            icon={Brain}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            label="Links Captured"
            value={stats?.byType?.link}
            icon={Link2}
            color="bg-blue-500/10 text-blue-500"
          />
          <StatCard
            label="Images Stored"
            value={stats?.byType?.image}
            icon={Image}
            color="bg-emerald-500/10 text-emerald-500"
          />
          <StatCard
            label="This Week"
            value={stats?.recentCount}
            icon={TrendingUp}
            color="bg-amber-500/10 text-amber-500"
          />
        </div>

        {/* Processing Queue */}
        {stats && stats.byStatus?.processing > 0 && (
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-sm text-amber-600 dark:text-amber-400">
              <span className="font-medium">{stats.byStatus.processing}</span> item
              {stats.byStatus.processing !== 1 ? "s" : ""} being processed by AI
            </p>
          </div>
        )}

        {/* Recent Items */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Recent Captures</h2>
            </div>
            <button
              onClick={() => setLocation("/library")}
              className="text-xs text-primary hover:underline"
            >
              View all
            </button>
          </div>

          {itemsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : recentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Your brain is empty</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Start capturing knowledge from links, images, and text. The AI will organize everything for you.
              </p>
              <Button
                data-testid="button-start-capture"
                onClick={() => setLocation("/capture")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Capture your first item
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Type Breakdown */}
        {stats && stats.total > 0 && (
          <div className="mt-8 bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Knowledge by Type</h2>
            <div className="space-y-3">
              {[
                { label: "Links", value: stats.byType?.link ?? 0, color: "bg-blue-500", icon: Link2 },
                { label: "Images", value: stats.byType?.image ?? 0, color: "bg-emerald-500", icon: Image },
                { label: "Notes", value: stats.byType?.text ?? 0, color: "bg-violet-500", icon: FileText },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground w-14">{label}</span>
                  <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", color)}
                      style={{ width: `${stats.total > 0 ? (value / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground w-5 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
