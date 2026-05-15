import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  useCreateItem,
  useProcessItem,
  useUploadFile,
  getListItemsQueryKey,
  getGetItemStatsQueryKey,
} from "@workspace/api-client-react";
import { useListCategories } from "@/api/authHooks";
import { useListGroups } from "@/api/authHooks";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link2, Image, FileText, Upload, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "video" | "image" | "text";

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function Capture() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>("video");

  const createItem = useCreateItem();
  const processItem = useProcessItem();

  // Link form
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkTags, setLinkTags] = useState("");

  // Image form
  const [imageTitle, setImageTitle] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageTags, setImageTags] = useState("");
  const [imageSubmitting, setImageSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Text form
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [textTags, setTextTags] = useState("");

  // Organization
  const { data: categories } = useListCategories();
  const { data: groups } = useListGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(undefined);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  // Custom Instructions
  const [showInstructions, setShowInstructions] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");

  const templates = [
    "Extract key concepts and define each one",
    "Pick out all action items and to-do steps",
    "Focus only on [topic] — ignore the rest",
    "Summarize for a complete beginner",
    "List all tools, libraries, or resources mentioned",
  ];

  const parseTags = (raw: string) =>
    raw.split(",").map((t) => t.trim()).filter(Boolean);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListItemsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetItemStatsQueryKey() });
  };

  const renderCustomInstructions = () => (
    <div className="space-y-3 mt-4 pt-4 border-t">
      <button
        type="button"
        onClick={() => setShowInstructions(!showInstructions)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Sparkles className={cn("w-4 h-4", showInstructions && "text-primary fill-primary/20")} />
        {showInstructions ? "Hide Custom Instructions" : "Add Custom Instructions (optional)"}
      </button>

      {showInstructions && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs">Your Instructions</Label>
              <span className={cn("text-[10px]", customInstructions.length > 450 ? "text-destructive" : "text-muted-foreground")}>
                {customInstructions.length} / 500
              </span>
            </div>
            <Textarea
              placeholder="Tell the AI what to focus on, highlight, or extract..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value.slice(0, 500))}
              className="min-h-[100px] text-sm resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Quick Templates</Label>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCustomInstructions(t)}
                  className="text-[10px] px-2 py-1 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/20"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const startProcessing = (itemId: number) => {
    processItem.mutate(
      { id: itemId },
      {
        onSuccess: () => invalidate(),
        onError: () => invalidate(),
      }
    );
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    const url = normalizeUrl(linkUrl);
    let title = linkTitle.trim();
    if (!title) {
      try { title = new URL(url).hostname; } catch { title = url; }
    }
    createItem.mutate(
      { data: { title, sourceUrl: url, sourceType: "link", tags: parseTags(linkTags), groupId: selectedGroupId, categoryIds: selectedCategoryIds, customInstructions: customInstructions || undefined } },
      {
        onSuccess: (item) => {
          invalidate();
          toast({ title: "Link captured!", description: "AI is analyzing it now." });
          setLocation(`/item/${item.id}`);
          startProcessing(item.id);
        },
        onError: () => toast({ title: "Failed to capture link", variant: "destructive" }),
      }
    );
  };

  const handleImageSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }
    setImageFile(file);
    setImageTitle(file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !imageTitle.trim() || imageSubmitting) return;
    setImageSubmitting(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64Data = result.split(",")[1];
      if (!base64Data) {
        toast({ title: "Could not read image file", variant: "destructive" });
        setImageSubmitting(false);
        return;
      }
      createItem.mutate(
        { data: { title: imageTitle.trim(), sourceType: "image", rawContent: base64Data, tags: parseTags(imageTags), groupId: selectedGroupId, categoryIds: selectedCategoryIds, customInstructions: customInstructions || undefined } },
        {
          onSuccess: (item) => {
            setImageSubmitting(false);
            invalidate();
            toast({ title: "Image captured!", description: "AI analysis complete." });
            setLocation(`/item/${item.id}`);
          },
          onError: () => {
            setImageSubmitting(false);
            toast({ title: "Failed to save image", variant: "destructive" });
          },
        }
      );
    };
    reader.onerror = () => {
      setImageSubmitting(false);
      toast({ title: "Could not read image file", variant: "destructive" });
    };
    reader.readAsDataURL(imageFile);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textTitle.trim() || !textContent.trim()) return;
    createItem.mutate(
      { data: { title: textTitle.trim(), sourceType: "text", rawContent: textContent.trim(), tags: parseTags(textTags), groupId: selectedGroupId, categoryIds: selectedCategoryIds, customInstructions: customInstructions || undefined } },
      {
        onSuccess: (item) => {
          invalidate();
          toast({ title: "Note captured!", description: "AI is analyzing it now." });
          setLocation(`/item/${item.id}`);
          startProcessing(item.id);
        },
        onError: () => toast({ title: "Failed to save note", variant: "destructive" }),
      }
    );
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "video", label: "Video / Link", icon: Link2 },
    { id: "image", label: "Image", icon: Image },
    { id: "text", label: "Text", icon: FileText },
  ];

  const videoPending = createItem.isPending && activeTab === "video";
  const textPending = createItem.isPending && activeTab === "text";

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Capture Knowledge</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add a link, image, or text — AI will extract and structure the insights.
          </p>
        </div>

        {/* Manual tab bar */}
        <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all flex-1",
                activeTab === id
                  ? "bg-background text-foreground shadow"
                  : "hover:bg-background/50"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Only the active tab is rendered — no hidden DOM */}
        {activeTab === "video" && (
          <form onSubmit={handleLinkSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="text"
                placeholder="https://example.com or just example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                autoComplete="url"
              />
              <p className="text-[10px] text-muted-foreground italic flex items-center gap-1 mt-1">
                <Sparkles className="w-3 h-3 text-primary" />
                YouTube links automatically fetch full transcripts.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-title">Title (optional)</Label>
              <Input
                id="link-title"
                type="text"
                placeholder="Leave blank to auto-detect from URL"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-tags">Tags (comma-separated, optional)</Label>
              <Input
                id="link-tags"
                type="text"
                placeholder="ai, research, productivity"
                value={linkTags}
                onChange={(e) => setLinkTags(e.target.value)}
              />
            </div>
            {renderCustomInstructions()}
            <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
              <div className="space-y-2">
                <Label>Add to Cluster</Label>
                <select 
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                  value={selectedGroupId || ""}
                  onChange={(e) => setSelectedGroupId(e.target.value ? parseInt(e.target.value) : undefined)}
                >
                  <option value="">New/None</option>
                  {groups?.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select 
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                  multiple
                  value={selectedCategoryIds.map(String)}
                  onChange={(e) => setSelectedCategoryIds(Array.from(e.target.selectedOptions, o => parseInt(o.value)))}
                >
                  {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <p className="text-[10px] text-muted-foreground">Hold Ctrl to select multiple</p>
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={videoPending || !linkUrl.trim()}>
              {videoPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{videoPending ? "Saving..." : "Generate AI Notes"}</span>
            </Button>
          </form>
        )}

        {activeTab === "image" && (
          <form onSubmit={handleImageSubmit} className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                imagePreview
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith("image/")) handleImageSelect(file);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageSelect(file);
                }}
              />
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-40 mx-auto rounded-lg object-contain"
                  />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageFile(null);
                      setImagePreview(null);
                      setImageTitle("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="pointer-events-none select-none">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Drop an image here or{" "}
                    <span className="text-primary font-medium">click to browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, GIF, WebP up to 5MB
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-title">Title</Label>
              <Input
                id="image-title"
                type="text"
                placeholder="What is this image about?"
                value={imageTitle}
                onChange={(e) => setImageTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-tags">Tags (comma-separated, optional)</Label>
              <Input
                id="image-tags"
                type="text"
                placeholder="screenshot, diagram, reference"
                value={imageTags}
                onChange={(e) => setImageTags(e.target.value)}
              />
            </div>
            {renderCustomInstructions()}
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={imageSubmitting || !imageFile || !imageTitle.trim()}
            >
              {imageSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{imageSubmitting ? "Uploading..." : "Capture & Analyze"}</span>
            </Button>
          </form>
        )}

        {activeTab === "text" && (
          <form onSubmit={handleTextSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text-title">Title</Label>
              <Input
                id="text-title"
                type="text"
                placeholder="What is this note about?"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="text-content">Content</Label>
              <Textarea
                id="text-content"
                placeholder="Paste text, notes, ideas, or any content you want to save and analyze..."
                className="min-h-48 resize-none font-mono text-sm"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="text-tags">Tags (comma-separated, optional)</Label>
              <Input
                id="text-tags"
                type="text"
                placeholder="ideas, learning, reference"
                value={textTags}
                onChange={(e) => setTextTags(e.target.value)}
              />
            </div>
            {renderCustomInstructions()}
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={textPending || !textTitle.trim() || !textContent.trim()}
            >
              {textPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{textPending ? "Saving..." : "Capture & Analyze"}</span>
            </Button>
          </form>
        )}

        {/* Transcript tab removed as per request — always automated now */}
      </div>
    </Layout>
  );
}
