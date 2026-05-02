import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetItem,
  useGetRelatedItems,
  useProcessItem,
  useDeleteItem,
  useGenerateGuide,
  useExportItem,
  getGetItemQueryKey,
  getListItemsQueryKey,
  getGetItemStatsQueryKey,
  getGetRelatedItemsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { ItemCard } from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Sparkles,
  Download,
  Trash2,
  Link2,
  Image,
  FileText,
  ExternalLink,
  RefreshCw,
  Loader2,
  BookOpen,
  GitBranch,
  Map,
  CheckCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

function MarkdownNotes({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="prose-notes">
      {lines.map((line, i) => {
        if (line.startsWith("# ")) return <h1 key={i}>{line.slice(2)}</h1>;
        if (line.startsWith("## ")) return <h2 key={i}>{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i}>{line.slice(4)}</h3>;
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <ul key={i}>
              <li dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} />
            </ul>
          );
        }
        if (line.startsWith("---")) return <hr key={i} />;
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
        );
      })}
    </div>
  );
}

function formatInline(text: string) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-primary underline">$1</a>');
}

type GuideType = "steps" | "workflow" | "roadmap";

const guideTypeConfig: Record<GuideType, { icon: React.ElementType; label: string; description: string }> = {
  steps: { icon: BookOpen, label: "Step-by-Step Guide", description: "Actionable steps you can follow" },
  workflow: { icon: GitBranch, label: "Workflow", description: "Phases and tasks to complete" },
  roadmap: { icon: Map, label: "Learning Roadmap", description: "Milestones and progression path" },
};

export function ItemDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedGuideType, setSelectedGuideType] = useState<GuideType>("steps");
  const [generatedGuide, setGeneratedGuide] = useState<{
    title: string;
    content: string;
    steps: Array<{ stepNumber: number; title: string; description: string }>;
  } | null>(null);

  const { data: item, isLoading } = useGetItem(id, {
    query: { enabled: !!id, queryKey: getGetItemQueryKey(id) },
  });
  const { data: related } = useGetRelatedItems(id, {
    query: { enabled: !!id, queryKey: getGetRelatedItemsQueryKey(id) },
  });

  const processItem = useProcessItem();
  const deleteItem = useDeleteItem();
  const generateGuide = useGenerateGuide();
  const exportItem = useExportItem();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetItemQueryKey(id) });
    qc.invalidateQueries({ queryKey: getListItemsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetItemStatsQueryKey() });
  };

  const handleReprocess = () => {
    processItem.mutate(
      { id },
      {
        onSuccess: () => { invalidate(); toast({ title: "Reprocessed successfully" }); },
        onError: () => toast({ title: "Reprocessing failed", variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    deleteItem.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListItemsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetItemStatsQueryKey() });
          setLocation("/library");
          toast({ title: "Item deleted" });
        },
        onError: () => toast({ title: "Delete failed", variant: "destructive" }),
      }
    );
  };

  const handleGenerateGuide = () => {
    setGeneratedGuide(null);
    generateGuide.mutate(
      { id, data: { guideType: selectedGuideType } },
      {
        onSuccess: (guide) => setGeneratedGuide(guide),
        onError: () => toast({ title: "Guide generation failed", variant: "destructive" }),
      }
    );
  };

  const handleExport = () => {
    exportItem.mutate(
      { id },
      {
        onSuccess: (result) => {
          const blob = new Blob([result.content], { type: "text/markdown" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = result.filename;
          a.click();
          URL.revokeObjectURL(url);
          toast({ title: "Notes exported", description: result.filename });
        },
        onError: () => toast({ title: "Export failed", variant: "destructive" }),
      }
    );
  };

  const sourceTypeIcons = { link: Link2, image: Image, text: FileText };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!item) {
    return (
      <Layout>
        <div className="p-8 flex flex-col items-center justify-center h-full">
          <p className="text-muted-foreground">Item not found</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/library")}>
            Back to library
          </Button>
        </div>
      </Layout>
    );
  }

  const SourceIcon = sourceTypeIcons[item.sourceType] ?? FileText;

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Back */}
        <button
          data-testid="button-back"
          onClick={() => setLocation("/library")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to library
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <SourceIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground capitalize">{item.sourceType}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{item.title}</h1>
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-2 w-fit"
                data-testid="link-source-url"
              >
                <ExternalLink className="w-3 h-3" />
                {item.sourceUrl.length > 60 ? item.sourceUrl.slice(0, 60) + "..." : item.sourceUrl}
              </a>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            {item.status === "ready" && (
              <span className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full font-medium">
                <CheckCircle className="w-3 h-3" /> Ready
              </span>
            )}
            {item.status === "processing" && (
              <span className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full font-medium">
                <Loader2 className="w-3 h-3 animate-spin" /> Processing
              </span>
            )}
            {item.status === "pending" && (
              <span className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full font-medium">
                <Clock className="w-3 h-3" /> Pending
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="button-reprocess"
            onClick={handleReprocess}
            disabled={processItem.isPending || item.status === "processing"}
          >
            {processItem.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Re-process
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="button-generate-guide"
            onClick={() => setGuideOpen(true)}
            disabled={item.status !== "ready"}
          >
            <Sparkles className="w-4 h-4" />
            Generate Guide
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="button-export"
            onClick={handleExport}
            disabled={exportItem.isPending}
          >
            {exportItem.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            data-testid="button-delete"
            onClick={handleDelete}
            disabled={deleteItem.isPending}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            {item.imageUrl && (
              <div className="bg-card border border-card-border rounded-xl overflow-hidden">
                <img src={item.imageUrl} alt={item.title} className="w-full object-contain max-h-80" />
              </div>
            )}

            {/* Summary */}
            {item.summary && (
              <div className="bg-card border border-card-border rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI Summary
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
              </div>
            )}

            {/* Structured Notes */}
            {item.structuredNotes && (
              <div className="bg-card border border-card-border rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Structured Notes
                </h2>
                <MarkdownNotes content={item.structuredNotes} />
              </div>
            )}

            {/* Raw content */}
            {item.rawContent && !item.structuredNotes && (
              <div className="bg-card border border-card-border rounded-xl p-5">
                <h2 className="text-sm font-semibold text-foreground mb-3">Raw Content</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                  {item.rawContent}
                </p>
              </div>
            )}

            {/* Pending state */}
            {item.status === "pending" && !item.summary && (
              <div className="bg-card border border-card-border rounded-xl p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Not yet analyzed</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Click "Re-process" to let AI extract insights from this item.
                </p>
                <Button size="sm" onClick={handleReprocess} disabled={processItem.isPending}>
                  {processItem.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Analyze Now
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Key Concepts */}
            {item.keyConcepts.length > 0 && (
              <div className="bg-card border border-card-border rounded-xl p-4">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">
                  Key Concepts
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {item.keyConcepts.map((concept) => (
                    <span
                      key={concept}
                      className="text-xs bg-primary/8 text-primary px-2 py-0.5 rounded-md font-medium"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="bg-card border border-card-border rounded-xl p-4">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Related Items */}
            {related && related.length > 0 && (
              <div className="bg-card border border-card-border rounded-xl p-4">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">
                  Related Items
                </h3>
                <div className="space-y-2">
                  {related.slice(0, 4).map((rel) => (
                    <ItemCard key={rel.id} item={rel} className="!p-3" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate Guide Dialog */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate Guide
            </DialogTitle>
          </DialogHeader>

          {!generatedGuide ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose how you want to transform this knowledge:
              </p>
              <div className="grid grid-cols-1 gap-3">
                {(Object.entries(guideTypeConfig) as [GuideType, typeof guideTypeConfig[GuideType]][]).map(
                  ([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        data-testid={`guide-type-${type}`}
                        onClick={() => setSelectedGuideType(type)}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                          selectedGuideType === type
                            ? "border-primary bg-primary/8"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          selectedGuideType === type ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{config.label}</p>
                          <p className="text-xs text-muted-foreground">{config.description}</p>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
              <Button
                className="w-full gap-2"
                data-testid="button-generate-guide-confirm"
                onClick={handleGenerateGuide}
                disabled={generateGuide.isPending}
              >
                {generateGuide.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {generateGuide.isPending ? "Generating..." : "Generate"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">{generatedGuide.title}</h3>
              <div className="space-y-3">
                {generatedGuide.steps.map((step) => (
                  <div key={step.stepNumber} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold">
                      {step.stepNumber}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{step.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setGeneratedGuide(null)}
                >
                  Generate Another
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const content = generatedGuide.steps
                      .map((s) => `${s.stepNumber}. **${s.title}**\n   ${s.description}`)
                      .join("\n\n");
                    navigator.clipboard.writeText(content);
                    toast({ title: "Copied to clipboard" });
                  }}
                >
                  Copy Guide
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
