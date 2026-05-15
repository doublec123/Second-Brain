import { useState } from "react";
import {
  useListItemNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useEnhanceNote,
  getListItemNotesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  MessageSquare,
  Sparkles,
  Trash2,
  MoreVertical,
  Check,
  StickyNote,
  Lightbulb,
  CheckSquare,
  HelpCircle,
  User,
  Loader2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface PersonalNotesProps {
  itemId: number;
  sourceType: string;
}

const NOTE_TYPES = [
  { value: "general", label: "General Note", icon: StickyNote },
  { value: "takeaway", label: "Key Takeaway", icon: Lightbulb },
  { value: "action_item", label: "Action Item", icon: CheckSquare },
  { value: "question", label: "Question", icon: HelpCircle },
  { value: "reflection", label: "Personal Reflection", icon: User },
];

const FORMAT_OPTIONS = [
  { value: "plain", label: "Plain Text" },
  { value: "markdown", label: "Markdown" },
  { value: "bullet", label: "Bullet List" },
];

export function PersonalNotes({ itemId, sourceType }: PersonalNotesProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isEnhanceEnabled, setIsEnhanceEnabled] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    type: "general",
    format: "plain",
    target: "item",
    content: "",
  });

  const { data: notes, isLoading } = useListItemNotes(itemId, {
    query: { queryKey: getListItemNotesQueryKey(itemId) },
  });

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const enhanceNote = useEnhanceNote();

  const resetForm = () => {
    setFormData({
      type: "general",
      format: "plain",
      target: "item",
      content: "",
    });
    setEditingNoteId(null);
    setIsEnhanceEnabled(false);
  };

  const handleSave = async () => {
    if (!formData.content.trim()) return;

    const onSuccess = (note: any) => {
      qc.invalidateQueries({ queryKey: getListItemNotesQueryKey(itemId) });
      if (isEnhanceEnabled) {
        handleEnhance(note.id);
      } else {
        setIsOpen(false);
        resetForm();
        toast({ title: editingNoteId ? "Note updated" : "Note added" });
      }
    };

    if (editingNoteId) {
      updateNote.mutate(
        { id: editingNoteId, data: formData as any },
        { onSuccess, onError: () => toast({ title: "Failed to update note", variant: "destructive" }) }
      );
    } else {
      createNote.mutate(
        { id: itemId, data: formData as any },
        { onSuccess, onError: () => toast({ title: "Failed to add note", variant: "destructive" }) }
      );
    }
  };

  const handleEnhance = (noteId: number) => {
    enhanceNote.mutate(
      { id: noteId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListItemNotesQueryKey(itemId) });
          setIsOpen(false);
          resetForm();
          toast({ title: "Note saved and AI-enhanced!" });
        },
        onError: () => {
          setIsOpen(false);
          resetForm();
          toast({ title: "Note saved, but AI enhancement failed", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (noteId: number) => {
    if (confirm("Are you sure you want to delete this note?")) {
      deleteNote.mutate(
        { id: noteId },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListItemNotesQueryKey(itemId) });
            toast({ title: "Note deleted" });
          },
        }
      );
    }
  };

  const handleEdit = (note: any) => {
    setFormData({
      type: note.type,
      format: note.format,
      target: note.target,
      content: note.content,
    });
    setEditingNoteId(note.id);
    setIsOpen(true);
  };

  const getTargetOptions = () => {
    const options = [{ value: "item", label: "Full Item" }];
    if (sourceType === "link") options.push({ value: "link", label: "The Link" });
    if (sourceType === "image") options.push({ value: "image", label: "The Image" });
    return options;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          Your Notes
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            resetForm();
            setIsOpen(true);
          }}
          className="gap-2 h-8"
        >
          <Plus className="w-4 h-4" />
          Add Note
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-20 bg-muted animate-pulse rounded-xl" />
          <div className="h-20 bg-muted animate-pulse rounded-xl" />
        </div>
      ) : notes && notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => {
            const TypeIcon = NOTE_TYPES.find((t) => t.value === note.type)?.icon || StickyNote;
            return (
              <div
                key={note.id}
                className="group relative bg-card border border-card-border rounded-xl p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                      <TypeIcon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {NOTE_TYPES.find((t) => t.value === note.type)?.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">
                      Attached to {note.target}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7"
                      onClick={() => handleEdit(note)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-foreground leading-relaxed">
                  {note.format === "markdown" ? (
                    <div className="prose-notes prose-sm">
                      <ReactMarkdown>{note.content}</ReactMarkdown>
                    </div>
                  ) : note.format === "bullet" ? (
                    <ul className="list-disc list-inside space-y-1">
                      {note.content.split("\n").map((line: string, i: number) => (
                        <li key={i}>{line.replace(/^[-*+]\s*/, "")}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="whitespace-pre-wrap">{note.content}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed rounded-xl border-muted-foreground/20">
          <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No personal notes yet.</p>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNoteId ? "Edit Note" : "Add Personal Note"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Note Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        <div className="flex items-center gap-2">
                          <t.icon className="w-3 h-3" />
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Format</Label>
                <Select
                  value={formData.format}
                  onValueChange={(v) => setFormData({ ...formData, format: v })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value} className="text-xs">
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Attach To</Label>
              <div className="flex gap-2">
                {getTargetOptions().map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFormData({ ...formData, target: opt.value })}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all",
                      formData.target === opt.value
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-background border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Note Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={
                  formData.format === "bullet"
                    ? "Enter each bullet on a new line..."
                    : "Write your thoughts here..."
                }
                className="min-h-[150px] text-sm resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-foreground">AI Enhancement</p>
                  <p className="text-[10px] text-muted-foreground">Expand and polish with AI</p>
                </div>
              </div>
              <Switch
                checked={isEnhanceEnabled}
                onCheckedChange={setIsEnhanceEnabled}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={createNote.isPending || updateNote.isPending || enhanceNote.isPending}
              className="gap-2"
            >
              {(createNote.isPending || updateNote.isPending || enhanceNote.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {editingNoteId ? "Update Note" : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
