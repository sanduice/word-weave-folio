import { useState, useMemo } from "react";
import { EMOJI_DATA } from "./emoji-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onRemove?: () => void;
  hasIcon: boolean;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EmojiPicker({ onSelect, onRemove, hasIcon, children, open, onOpenChange }: EmojiPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return EMOJI_DATA;
    const q = search.toLowerCase();
    const result: Record<string, string[]> = {};
    for (const [cat, emojis] of Object.entries(EMOJI_DATA)) {
      // Simple filter: category name match or just show all (emoji search is hard without names)
      if (cat.toLowerCase().includes(q)) {
        result[cat] = emojis;
      }
    }
    // If no category matched, show all emojis flattened
    if (Object.keys(result).length === 0) {
      result["Results"] = Object.values(EMOJI_DATA).flat();
    }
    return result;
  }, [search]);

  return (
    <Popover open={open} onOpenChange={(v) => { onOpenChange?.(v); if (!v) setSearch(""); }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" sideOffset={8}>
        <div className="p-3 pb-2 space-y-2">
          <Input
            placeholder="Search category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
          {hasIcon && onRemove && (
            <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" onClick={() => { onRemove(); onOpenChange?.(false); }}>
              <X className="h-3.5 w-3.5 mr-1" /> Remove icon
            </Button>
          )}
        </div>
        <ScrollArea className="h-64 px-3 pb-3">
          {Object.entries(filtered).map(([category, emojis]) => (
            <div key={category} className="mb-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{category}</p>
              <div className="grid grid-cols-8 gap-0.5">
                {emojis.map((emoji, i) => (
                  <button
                    key={`${category}-${i}`}
                    className="h-8 w-8 flex items-center justify-center text-lg rounded hover:bg-accent transition-colors"
                    onClick={() => { onSelect(emoji); onOpenChange?.(false); setSearch(""); }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
