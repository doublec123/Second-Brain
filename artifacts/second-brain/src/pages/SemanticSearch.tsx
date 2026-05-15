import { useState, useCallback } from "react";
import { useSemanticSearch, getSemanticSearchQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { ItemCard } from "@/components/ItemCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Sparkles, Lightbulb } from "lucide-react";

const EXAMPLE_QUERIES = [
  "How does machine learning work?",
  "Productivity techniques for deep work",
  "Best practices for software architecture",
  "Understanding human psychology",
];

export function SemanticSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (timer) clearTimeout(timer);
    if (value.trim().length >= 3) {
      const t = setTimeout(() => setDebouncedQuery(value.trim()), 600);
      setTimer(t);
    } else {
      setDebouncedQuery("");
    }
  }, [timer]);

  const { data: results, isLoading, isFetching } = useSemanticSearch(
    { q: debouncedQuery },
    {
      query: {
        enabled: debouncedQuery.length >= 3,
        queryKey: getSemanticSearchQueryKey({ q: debouncedQuery }),
      },
    }
  );

  const showResults = debouncedQuery.length >= 3;
  const showLoading = isLoading || isFetching;

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Semantic Search</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Ask a question or describe what you're looking for. AI understands intent, not just keywords.
          </p>
        </div>

        {/* Search input */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            data-testid="input-semantic-search"
            type="search"
            placeholder="Ask anything about your knowledge base..."
            className="pl-12 h-12 text-base rounded-xl"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            autoFocus
          />
          {(isLoading || isFetching) && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}
        </div>

        {/* Example queries */}
        {!showResults && !query && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Try asking:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  data-testid={`example-query-${q.slice(0, 20)}`}
                  onClick={() => handleChange(q)}
                  className="text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full border border-border hover:border-primary/30 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {showResults && (
          <div>
            {showLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-xl" />
                ))}
              </div>
            ) : results && results.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-muted-foreground">
                    Found <span className="font-medium text-foreground">{results.length}</span> relevant items for
                  </span>
                  <span className="text-sm font-medium text-primary">"{debouncedQuery}"</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No results found</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  No items in your knowledge base match this query. Try different keywords or capture more content.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
