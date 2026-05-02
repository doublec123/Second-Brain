import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  useCreateItem,
  useProcessItem,
  useUploadFile,
  getListItemsQueryKey,
  getGetItemStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Link2, Image, FileText, Upload, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Capture() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const createItem = useCreateItem();
  const processItem = useProcessItem();
  const uploadFile = useUploadFile();

  // Link form state
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkTags, setLinkTags] = useState("");

  // Image form state
  const [imageTitle, setImageTitle] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageTags, setImageTags] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Text form state
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [textTags, setTextTags] = useState("");

  const parseTags = (raw: string) =>
    raw.split(",").map((t) => t.trim()).filter(Boolean);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListItemsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetItemStatsQueryKey() });
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl) return;

    const title = linkTitle || new URL(linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`).hostname;

    createItem.mutate(
      { data: { title, sourceUrl: linkUrl, sourceType: "link", tags: parseTags(linkTags) } },
      {
        onSuccess: (item) => {
          invalidate();
          toast({ title: "Link captured!", description: "AI is analyzing it now." });
          processItem.mutate({ id: item.id }, {
            onSuccess: () => { invalidate(); setLocation(`/item/${item.id}`); },
          });
        },
        onError: () => toast({ title: "Failed to capture link", variant: "destructive" }),
      }
    );
  };

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    setImageTitle(file.name.replace(/\.[^.]+$/, "").replace(/_/g, " "));
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !imageTitle) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Data = (ev.target?.result as string).split(",")[1];
      uploadFile.mutate(
        { data: { filename: imageFile.name, mimeType: imageFile.type, base64Data } },
        {
          onSuccess: (upload) => {
            createItem.mutate(
              {
                data: {
                  title: imageTitle,
                  sourceType: "image",
                  imageUrl: upload.url,
                  tags: parseTags(imageTags),
                },
              },
              {
                onSuccess: (item) => {
                  invalidate();
                  toast({ title: "Image captured!", description: "AI is analyzing it now." });
                  processItem.mutate({ id: item.id }, {
                    onSuccess: () => { invalidate(); setLocation(`/item/${item.id}`); },
                  });
                },
              }
            );
          },
          onError: () => toast({ title: "Failed to upload image", variant: "destructive" }),
        }
      );
    };
    reader.readAsDataURL(imageFile);
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textTitle || !textContent) return;

    createItem.mutate(
      { data: { title: textTitle, sourceType: "text", rawContent: textContent, tags: parseTags(textTags) } },
      {
        onSuccess: (item) => {
          invalidate();
          toast({ title: "Note captured!", description: "AI is analyzing it now." });
          processItem.mutate({ id: item.id }, {
            onSuccess: () => { invalidate(); setLocation(`/item/${item.id}`); },
          });
        },
        onError: () => toast({ title: "Failed to capture note", variant: "destructive" }),
      }
    );
  };

  const isLoading = createItem.isPending || processItem.isPending || uploadFile.isPending;

  return (
    <Layout>
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Capture Knowledge</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add a link, image, or text — AI will extract and structure the insights.
          </p>
        </div>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid grid-cols-3 w-full mb-6">
            <TabsTrigger value="link" data-testid="tab-link" className="gap-2">
              <Link2 className="w-4 h-4" /> Link
            </TabsTrigger>
            <TabsTrigger value="image" data-testid="tab-image" className="gap-2">
              <Image className="w-4 h-4" /> Image
            </TabsTrigger>
            <TabsTrigger value="text" data-testid="tab-text" className="gap-2">
              <FileText className="w-4 h-4" /> Text
            </TabsTrigger>
          </TabsList>

          {/* LINK */}
          <TabsContent value="link">
            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="link-url">URL *</Label>
                <Input
                  id="link-url"
                  data-testid="input-link-url"
                  type="url"
                  placeholder="https://example.com/article"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-title">Title (optional)</Label>
                <Input
                  id="link-title"
                  data-testid="input-link-title"
                  placeholder="Leave blank to auto-detect"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-tags">Tags (comma-separated)</Label>
                <Input
                  id="link-tags"
                  data-testid="input-link-tags"
                  placeholder="ai, research, productivity"
                  value={linkTags}
                  onChange={(e) => setLinkTags(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isLoading || !linkUrl}
                data-testid="button-submit-link"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isLoading ? "Processing..." : "Capture & Analyze"}
              </Button>
            </form>
          </TabsContent>

          {/* IMAGE */}
          <TabsContent value="image">
            <form onSubmit={handleImageSubmit} className="space-y-4">
              {/* Drop zone */}
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
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto rounded-lg object-contain" />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                      onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Drop an image here or <span className="text-primary font-medium">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 50MB</p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="image-title">Title *</Label>
                <Input
                  id="image-title"
                  data-testid="input-image-title"
                  placeholder="What is this image about?"
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-tags">Tags (comma-separated)</Label>
                <Input
                  id="image-tags"
                  data-testid="input-image-tags"
                  placeholder="screenshot, notes, diagram"
                  value={imageTags}
                  onChange={(e) => setImageTags(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isLoading || !imageFile || !imageTitle}
                data-testid="button-submit-image"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isLoading ? "Processing..." : "Capture & Analyze"}
              </Button>
            </form>
          </TabsContent>

          {/* TEXT */}
          <TabsContent value="text">
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-title">Title *</Label>
                <Input
                  id="text-title"
                  data-testid="input-text-title"
                  placeholder="What is this note about?"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text-content">Content *</Label>
                <Textarea
                  id="text-content"
                  data-testid="input-text-content"
                  placeholder="Paste text, notes, ideas, or any content you want to save and analyze..."
                  className="min-h-48 resize-none font-mono text-sm"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text-tags">Tags (comma-separated)</Label>
                <Input
                  id="text-tags"
                  data-testid="input-text-tags"
                  placeholder="ideas, learning, reference"
                  value={textTags}
                  onChange={(e) => setTextTags(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isLoading || !textTitle || !textContent}
                data-testid="button-submit-text"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isLoading ? "Processing..." : "Capture & Analyze"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Processing indicator */}
        {isLoading && (
          <div className="mt-6 bg-primary/8 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">AI is analyzing your content</p>
              <p className="text-xs text-muted-foreground">Extracting insights, summarizing, and organizing...</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
