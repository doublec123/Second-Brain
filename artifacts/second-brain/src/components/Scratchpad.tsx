import { useState, useEffect } from "react";
import { useCreateItem } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { StickyNote, X, Send, Save, Loader2 } from "lucide-react";

export function Scratchpad() {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const createItem = useCreateItem();

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem("scratchpad_draft");
    if (savedDraft) {
      setContent(savedDraft);
    }
  }, []);

  const handleSaveDraft = () => {
    localStorage.setItem("scratchpad_draft", content);
    toast({ title: "Draft saved locally" });
  };

  const handleSaveNow = () => {
    if (!content.trim()) return;

    createItem.mutate(
      {
        data: {
          title: content.split("\n")[0].slice(0, 50) || "Quick Note",
          sourceType: "text",
          rawContent: content,
        },
      },
      {
        onSuccess: () => {
          setContent("");
          localStorage.removeItem("scratchpad_draft");
          setIsOpen(false);
          toast({ title: "Note captured successfully" });
        },
        onError: () => {
          toast({ title: "Failed to save note", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-card border border-card-border shadow-2xl rounded-2xl w-80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-primary px-4 py-3 flex items-center justify-between text-primary-foreground">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4" />
              <span className="text-sm font-semibold">Scratchpad</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type a quick note..."
              className="min-h-[120px] text-sm resize-none focus-visible:ring-primary"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                className="gap-2 h-9 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                Save Draft
              </Button>
              <Button
                size="sm"
                onClick={handleSaveNow}
                disabled={!content.trim() || createItem.isPending}
                className="gap-2 h-9 text-xs"
              >
                {createItem.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Save Now
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 p-0"
          data-testid="button-scratchpad"
        >
          <StickyNote className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
}
