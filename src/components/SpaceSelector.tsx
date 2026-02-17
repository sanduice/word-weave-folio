import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useCreateSpace } from "@/hooks/use-spaces";
import type { Space } from "@/hooks/use-spaces";

interface SpaceSelectorProps {
  spaces: Space[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const EMOJI_OPTIONS = ["📘", "📄", "💡", "🚀", "📝", "🎯", "🔧", "📊", "🧠", "🏠", "💼", "🎨"];

export function SpaceSelector({ spaces, selectedId, onSelect }: SpaceSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📘");
  const createSpace = useCreateSpace();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const result = await createSpace.mutateAsync({ name: newName.trim(), icon: newIcon });
    onSelect(result.id);
    setNewName("");
    setNewIcon("📘");
    setDialogOpen(false);
  };

  return (
    <div className="flex items-center gap-1 px-2">
      <Select value={selectedId ?? ""} onValueChange={onSelect}>
        <SelectTrigger className="h-8 text-sm border-none shadow-none bg-sidebar-accent/50 flex-1">
          <SelectValue placeholder="Select space" />
        </SelectTrigger>
        <SelectContent>
          {spaces.map((space) => (
            <SelectItem key={space.id} value={space.id}>
              <span className="mr-1.5">{space.icon}</span>
              {space.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Space</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className={`text-lg p-1 rounded ${newIcon === emoji ? "bg-accent ring-2 ring-ring" : "hover:bg-accent"}`}
                  onClick={() => setNewIcon(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <Input
              placeholder="Space name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={!newName.trim()} className="w-full">
              Create Space
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
