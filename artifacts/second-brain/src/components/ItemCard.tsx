import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Link2, Image, FileText, Clock, CheckCircle, Loader2, Star, Sparkles } from "lucide-react";
import { useUpdateItem, getListItemsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { KnowledgeItem } from "@workspace/api-client-react";

const sourceTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
  link: { icon: Link2, label: "Link", color: "text-blue-500" },
  image: { icon: Image, label: "Image", color: "text-emerald-500" },
  text: { icon: FileText, label: "Text", color: "text-violet-500" },
  transcript: { icon: FileText, label: "Transcript", color: "text-amber-500" },
};

const statusConfig = {
  pending: { icon: Clock, label: "Pending", className: "bg-muted text-muted-foreground" },
  processing: { icon: Loader2, label: "Processing", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  ready: { icon: CheckCircle, label: "Ready", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

interface ItemCardProps {
  item: KnowledgeItem;
  className?: string;
}

export function ItemCard({ item, className }: ItemCardProps) {
  const sourceConfig = sourceTypeConfig[item.sourceType] ?? sourceTypeConfig.text;
  const SourceIcon = sourceConfig.icon;
  const statusCfg = statusConfig[item.status] ?? statusConfig.pending;
  const StatusIcon = statusCfg.icon;
  const qc = useQueryClient();
  const updateItem = useUpdateItem({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListItemsQueryKey() });
      }
    }
  });

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateItem.mutate({ id: item.id, data: { isFavorite: !item.isFavorite } });
  };

  return (
    <Link
      href={`/item/${item.id}`}
      data-testid={`card-item-${item.id}`}
      className={cn(
        "group block bg-card border border-card-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer",
        className
      )}
    >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <SourceIcon className={cn("w-4 h-4 shrink-0", sourceConfig.color)} />
            <h3 className="font-medium text-sm text-card-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {item.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={toggleFavorite}
              className={cn(
                "p-1 rounded-md transition-colors",
                item.isFavorite ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Star className={cn("w-3.5 h-3.5", item.isFavorite && "fill-current")} />
            </button>
            <span className={cn("flex items-center gap-1 text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium", statusCfg.className)}>
              <StatusIcon className={cn("w-3 h-3", item.status === "processing" && "animate-spin")} />
              {statusCfg.label}
            </span>
            {item.customInstructions && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-tighter">
                <Sparkles className="w-2.5 h-2.5" />
                Guided
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        {item.summary && (
          <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
            {item.summary}
          </p>
        )}



        {/* Key Concepts */}
        {item.keyConcepts.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.keyConcepts.slice(0, 4).map((concept, idx) => (
              <span
                key={`${concept}-${idx}`}
                className="text-xs bg-primary/8 text-primary px-2 py-0.5 rounded-md font-medium"
              >
                {concept}
              </span>
            ))}
            {item.keyConcepts.length > 4 && (
              <span className="text-xs text-muted-foreground px-1">+{item.keyConcepts.length - 4}</span>
            )}
          </div>
        )}

        {/* Tags + Date */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={`${tag}-${idx}`} variant="secondary" className="text-xs py-0 px-1.5 h-5">
                {tag}
              </Badge>
            ))}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
    </Link>
  );
}
