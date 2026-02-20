import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSearchPages } from "@/hooks/use-pages";
import { useAppStore } from "@/stores/app-store";
import { FileText, Folder, Search } from "lucide-react";

export function SearchDialog() {
  const { searchOpen, setSearchOpen, setSelectedSpaceId, setSelectedPageId } = useAppStore();
  const [query, setQuery] = useState("");
  const searchPages = useSearchPages();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setQuery("");
      searchPages.reset();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (query.length >= 2) {
      searchPages.mutate(query);
    }
  }, [query]);

  const handleSelect = (result: any) => {
    setSelectedSpaceId(result.space_id);
    setSelectedPageId(result.id);
    setSearchOpen(false);
  };

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <div className="flex items-center px-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages..."
            className="border-none shadow-none focus-visible:ring-0 h-12"
          />
        </div>
        <div className="max-h-80 overflow-auto p-2">
          {query.length < 2 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Type to search...</p>
          ) : searchPages.isPending ? (
            <p className="text-sm text-muted-foreground text-center py-8">Searching...</p>
          ) : searchPages.data && searchPages.data.length > 0 ? (
            <div className="space-y-0.5">
              {searchPages.data.map((result: any) => {
                const spaceName = result.spaces?.name;
                const spaceIcon = result.spaces?.icon;
                const folderName = result.folders?.name;
                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left hover:bg-accent transition-colors"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{result.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        {spaceIcon && <span>{spaceIcon}</span>}
                        {spaceName && <span>{spaceName}</span>}
                        {folderName && (
                          <>
                            <span className="mx-0.5">›</span>
                            <Folder className="h-3 w-3 shrink-0" />
                            <span>{folderName}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No results found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
