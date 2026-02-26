import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Plus, Check } from "lucide-react";
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

  const activeSpace = spaces.find((s) => s.id === selectedId);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const result = await createSpace.mutateAsync({ name: newName.trim(), icon: newIcon });
    onSelect(result.id);
    setNewName("");
    setNewIcon("📘");
    setDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 h-auto justify-start cursor-pointer">
            <span className="text-lg shrink-0">{activeSpace?.icon ?? "📘"}</span>
            <span className="font-semibold text-sm text-sidebar-foreground truncate">
              {activeSpace?.name ?? "Select space"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {spaces.map((space) => (
            <DropdownMenuItem
              key={space.id}
              onClick={() => onSelect(space.id)}
              className="gap-2"
            >
              <span>{space.icon}</span>
              <span className="truncate flex-1">{space.name}</span>
              {space.id === selectedId && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            New Space
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Space</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {EMOJI_OPTIONS.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  className={`text-lg p-1 h-auto ${newIcon === emoji ? "bg-accent ring-2 ring-ring" : ""}`}
                  onClick={() => setNewIcon(emoji)}
                >
                  {emoji}
                </Button>
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
    </>
  );
}
