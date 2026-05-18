import { useState } from "react";
import {
  useListItems,
  useListTags,
  useDeleteItem,
  getListItemsQueryKey,
  getGetItemStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { ItemCard } from "@/components/ItemCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Library as LibraryIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterType = "all" | "link" | "image" | "text";
type FilterStatus = "all" | "pending" | "processing" | "ready";

export function Library() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterTag, setFilterTag] = useState<string>("");

  const { data: items, isLoading } = useListItems({
    q: search || undefined,
    type: filterType !== "all" ? filterType : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
    tag: filterTag || undefined,
  });
  const { data: tags } = useListTags();
  const deleteItem = useDeleteItem();

  const hasFilters = filterType !== "all" || filterStatus !== "all" || filterTag || search;

  const clearFilters = () => {
    setSearch("");
    setFilterType("all");
    setFilterStatus("all");
    setFilterTag("");
  };

  const typeButtons: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "link", label: "Links" },
    { value: "image", label: "Images" },
    { value: "text", label: "Notes" },
  ];

  const statusButtons: { value: FilterStatus; label: string }[] = [
    { value: "all", label: "All" },
    { value: "ready", label: "Ready" },
    { value: "processing", label: "Processing" },
    { value: "pending", label: "Pending" },
  ];

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <LibraryIcon className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Knowledge Library</h1>
          </div>
          {items && (
            <span className="text-sm text-muted-foreground">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-library-search"
            type="search"
            placeholder="Search by title, summary, concept, or tag..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Type filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1.5 mr-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Type:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {typeButtons.map(({ value, label }) => (
                <button
                  key={value}
                  data-testid={`filter-type-${value}`}
                  onClick={() => setFilterType(value)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-md font-medium transition-colors",
                    filterType === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Status filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground mr-2">Status:</span>
            <div className="flex flex-wrap gap-1.5">
              {statusButtons.map(({ value, label }) => (
                <button
                  key={value}
                  data-testid={`filter-status-${value}`}
                  onClick={() => setFilterStatus(value)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-md font-medium transition-colors",
                    filterStatus === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>

        {/* Tag pills */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {tags.map((tag, idx) => (
              <button
                key={`${tag.id}-${tag.name}-${idx}`}
                data-testid={`tag-filter-${tag.name}`}
                onClick={() => setFilterTag(filterTag === tag.name ? "" : tag.name)}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-all",
                  filterTag === tag.name
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
                <span className="opacity-60">({tag.itemCount})</span>
              </button>
            ))}
          </div>
        )}

        {/* Items grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : items && items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Array.isArray(items) ? items : []).map((item, idx) => (
              <ItemCard key={`${item.id}-${idx}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <LibraryIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {hasFilters ? "No items match your filters" : "Library is empty"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {hasFilters
                ? "Try adjusting your search or filters"
                : "Capture your first piece of knowledge to get started"}
            </p>
            {hasFilters && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
