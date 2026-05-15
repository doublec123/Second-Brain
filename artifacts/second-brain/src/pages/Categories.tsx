import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useListCategories, useListGroups, useCreateCategory, useCreateGroup, useDeleteCategory, useUpdateCategory } from "@/api/authHooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Folder, ChevronRight, Plus, Hash, Trash2, 
  Book, Code, Cpu, Globe, Music, Video, Image as ImageIcon, Terminal, Atom, Beaker, Brain, 
  Briefcase, Camera, Coffee, Film, Heart, Home, Layers, Lightbulb, Link, Map, 
  MessageCircle, Mic, Package, Phone, Play, Search, Settings, Shield, ShoppingBag, 
  Smartphone, Star, Tag, User, Users, Zap
} from "lucide-react";

const AVAILABLE_ICONS = {
  Book, Code, Cpu, Globe, Music, Video, Image: ImageIcon, ImageIcon, Terminal, Atom, Beaker, Brain, 
  Briefcase, Camera, Coffee, Film, Heart, Home, Layers, Lightbulb, Link, Map, 
  MessageCircle, Mic, Package, Phone, Play, Search, Settings, Shield, ShoppingBag, 
  Smartphone, Star, Tag, User, Users, Zap, Folder
};

type IconName = keyof typeof AVAILABLE_ICONS;

function CategoryIcon({ name, className }: { name?: string | null, className?: string }) {
  const Icon = name && AVAILABLE_ICONS[name as IconName] ? AVAILABLE_ICONS[name as IconName] : Folder;
  return <Icon className={className} />;
}
import { cn } from "@/lib/utils";

export function Categories() {
  const { data: categories, isLoading: isCatsLoading } = useListCategories();
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const createGroup = useCreateGroup();
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [isEditCatOpen, setIsEditCatOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState<IconName>("Folder");
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  
  const updateCategory = useUpdateCategory();
  
  const { data: groups, isLoading: isGroupsLoading } = useListGroups(
    selectedCatId ? { categoryId: selectedCatId } : undefined
  );

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto flex gap-8 h-full">
        {/* Categories Sidebar/List */}
        <div className="w-72 shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Categories</h2>
            <button onClick={() => setIsCatOpen(true)} className="p-1 hover:bg-muted rounded-md transition-colors">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-1">
            {isCatsLoading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)
            ) : categories?.map((cat) => (
              <div
                key={cat.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedCatId(cat.id === selectedCatId ? null : cat.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedCatId(cat.id === selectedCatId ? null : cat.id);
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group cursor-pointer",
                  selectedCatId === cat.id
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    selectedCatId === cat.id ? "bg-primary-foreground/20" : "bg-muted"
                  )} style={{ color: selectedCatId === cat.id ? undefined : cat.color }}>
                    <CategoryIcon name={cat.icon} className="w-4 h-4" />
                  </div>
                  {cat.name}
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    selectedCatId === cat.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {cat.itemCount}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCat(cat);
                      setNewCatName(cat.name);
                      setNewCatIcon((cat.icon as IconName) || "Folder");
                      setIsEditCatOpen(true);
                    }}
                    className={cn(
                      "p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity",
                      selectedCatId === cat.id ? "hover:bg-primary-foreground/20" : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Are you sure you want to delete this category?")) {
                        deleteCategory.mutate(cat.id, {
                          onSuccess: () => {
                            toast({ title: "Category deleted" });
                            if (selectedCatId === cat.id) setSelectedCatId(null);
                          }
                        });
                      }
                    }}
                    className={cn(
                      "p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity",
                      selectedCatId === cat.id ? "hover:bg-primary-foreground/20" : "hover:bg-destructive/10 text-destructive"
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                {selectedCatId ? categories?.find(c => c.id === selectedCatId)?.name : "All Knowledge"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {selectedCatId ? "Clusters in this category" : "Overview of all structured knowledge clusters"}
              </p>
            </div>
            <button onClick={() => setIsGroupOpen(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Plus className="w-4 h-4" /> New Cluster
            </button>
          </div>

          {isGroupsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
            </div>
          ) : groups && groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => (
                <div 
                  key={group.id}
                  className="group bg-card border border-card-border rounded-2xl p-5 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Folder className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex -space-x-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">{group.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{group.description || "No description provided."}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <Hash className="w-3 h-3" /> {new Date(group.createdAt).toLocaleDateString()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center bg-muted/20 rounded-3xl border border-dashed border-border">
              <div className="w-20 h-20 rounded-3xl bg-background flex items-center justify-center mb-6 shadow-sm">
                <Folder className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No clusters found</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {selectedCatId ? "Create your first cluster in this category." : "Start by creating a category on the left."}
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isCatOpen} onOpenChange={setIsCatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="e.g. Science" />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-6 gap-2 h-40 overflow-y-auto p-2 border rounded-md">
                {(Object.keys(AVAILABLE_ICONS) as IconName[]).map((iconName) => {
                  const Icon = AVAILABLE_ICONS[iconName];
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setNewCatIcon(iconName)}
                      className={cn(
                        "p-2 rounded-md hover:bg-muted flex items-center justify-center transition-all",
                        newCatIcon === iconName ? "bg-primary text-primary-foreground scale-110" : "text-muted-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCatOpen(false)}>Cancel</Button>
            <Button disabled={!newCatName || createCategory.isPending} onClick={() => {
              createCategory.mutate({ name: newCatName, icon: newCatIcon }, {
                onSuccess: () => {
                  setIsCatOpen(false);
                  setNewCatName("");
                  setNewCatIcon("Folder");
                  toast({ title: "Category created!" });
                }
              });
            }}>
              {createCategory.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <span>Create</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditCatOpen} onOpenChange={setIsEditCatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="e.g. Science" />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-6 gap-2 h-40 overflow-y-auto p-2 border rounded-md">
                {(Object.keys(AVAILABLE_ICONS) as IconName[]).map((iconName) => {
                  const Icon = AVAILABLE_ICONS[iconName];
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setNewCatIcon(iconName)}
                      className={cn(
                        "p-2 rounded-md hover:bg-muted flex items-center justify-center transition-all",
                        newCatIcon === iconName ? "bg-primary text-primary-foreground scale-110" : "text-muted-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCatOpen(false)}>Cancel</Button>
            <Button disabled={!newCatName || updateCategory.isPending} onClick={() => {
              updateCategory.mutate({ id: editingCat.id, data: { name: newCatName, icon: newCatIcon } }, {
                onSuccess: () => {
                  setIsEditCatOpen(false);
                  setNewCatName("");
                  setNewCatIcon("Folder");
                  setEditingCat(null);
                }
              });
            }}>
              {updateCategory.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <span>Save Changes</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isGroupOpen} onOpenChange={setIsGroupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Cluster</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={newGroupTitle} onChange={e => setNewGroupTitle(e.target.value)} placeholder="e.g. Machine Learning Basics" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="Optional description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupOpen(false)}>Cancel</Button>
            <Button disabled={!newGroupTitle || createGroup.isPending} onClick={() => {
              createGroup.mutate({ title: newGroupTitle, description: newGroupDesc }, {
                onSuccess: () => {
                  setIsGroupOpen(false);
                  setNewGroupTitle("");
                  setNewGroupDesc("");
                  toast({ title: "Cluster created!" });
                }
              });
            }}>
              {createGroup.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <span>Create</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
