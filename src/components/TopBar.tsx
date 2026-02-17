import { useAppStore } from "@/stores/app-store";
import { useSpaces } from "@/hooks/use-spaces";
import { usePage, useCreatePage } from "@/hooks/use-pages";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus, Search, Star } from "lucide-react";
import { useUpdatePage } from "@/hooks/use-pages";

export function TopBar() {
  const { selectedSpaceId, selectedPageId, setSelectedPageId, setSearchOpen } = useAppStore();
  const { data: spaces } = useSpaces();
  const { data: page } = usePage(selectedPageId ?? undefined);
  const createPage = useCreatePage();
  const updatePage = useUpdatePage();

  const currentSpace = spaces?.find((s) => s.id === selectedSpaceId);

  const handleNewPage = async () => {
    if (!selectedSpaceId) return;
    const result = await createPage.mutateAsync({ space_id: selectedSpaceId, title: "Untitled" });
    setSelectedPageId(result.id);
  };

  const toggleFavorite = () => {
    if (!page) return;
    updatePage.mutate({ id: page.id, is_favorite: !page.is_favorite });
  };

  return (
    <header className="flex items-center h-12 px-4 border-b border-border bg-background shrink-0">
      <SidebarTrigger className="mr-3" />

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-1 min-w-0">
        {currentSpace && (
          <>
            <span>{currentSpace.icon}</span>
            <span className="truncate">{currentSpace.name}</span>
          </>
        )}
        {page && (
          <>
            <span className="text-muted-foreground/40">/</span>
            <span className="truncate text-foreground font-medium">{page.title}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        {page && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFavorite}>
            <Star className={`h-4 w-4 ${page.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
          <span className="text-xs hidden sm:inline">⌘K</span>
        </Button>
        <Button variant="default" size="sm" className="h-8 gap-1.5" onClick={handleNewPage} disabled={!selectedSpaceId}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Page</span>
        </Button>
      </div>
    </header>
  );
}
