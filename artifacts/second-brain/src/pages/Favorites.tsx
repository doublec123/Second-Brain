import { useState } from "react";
import {
  useListItems,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { ItemCard } from "@/components/ItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";

export function Favorites() {
  const { data: items, isLoading } = useListItems({
    isFavorite: true,
  });

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Favorites</h1>
              <p className="text-sm text-muted-foreground">Quick access to your most important knowledge</p>
            </div>
          </div>
          {items && (
            <span className="text-sm font-medium bg-muted px-3 py-1 rounded-full text-muted-foreground">
              {items.length} saved
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : items && items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(Array.isArray(items) ? items : []).map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-muted/30 rounded-3xl border border-dashed border-border">
            <div className="w-20 h-20 rounded-3xl bg-background flex items-center justify-center mb-6 shadow-sm">
              <Star className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No favorites yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Mark notes as favorites to see them here for quick access.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
