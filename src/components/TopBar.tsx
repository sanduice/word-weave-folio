import { useAppStore } from "@/stores/app-store";
import { useSpaces } from "@/hooks/use-spaces";
import { usePage, useCreatePage } from "@/hooks/use-pages";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Star, MessageSquare, Share2 } from "lucide-react";
import { ShareDialog } from "@/components/ShareDialog";
import { useUpdatePage } from "@/hooks/use-pages";
import { useComments } from "@/hooks/use-comments";
import { usePageShares } from "@/hooks/use-page-shares";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function TopBar() {
  const { selectedSpaceId, selectedPageId, setSelectedPageId, setSearchOpen, commentPanelOpen, setCommentPanelOpen } = useAppStore();
  const { data: spaces } = useSpaces();
  const { data: page } = usePage(selectedPageId ?? undefined);
  const { data: comments = [] } = useComments(selectedPageId ?? undefined);
  const { data: shares = [] } = usePageShares(selectedPageId ?? undefined);
  const createPage = useCreatePage();
  const updatePage = useUpdatePage();

  const currentSpace = spaces?.find((s) => s.id === selectedSpaceId);
  const openCommentCount = comments.filter((c: any) => c.status === "open").length;

  // Fetch profiles for shares that have shared_with_id
  const sharedUserIds = shares
    .filter((s: any) => s.shared_with_id)
    .map((s: any) => s.shared_with_id) as string[];

  const { data: sharedProfiles = [] } = useQuery({
    queryKey: ["shared-profiles", selectedPageId, sharedUserIds],
    enabled: sharedUserIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .in("id", sharedUserIds);
      return data ?? [];
    },
  });

  const visibleAvatars = sharedProfiles.slice(0, 3);
  const extraCount = sharedProfiles.length - 3;

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
    <header className="flex items-center h-12 px-4 border-b border-border bg-background shrink-0 sticky top-0 z-30">
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
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 relative"
              onClick={() => setCommentPanelOpen(!commentPanelOpen)}
            >
              <MessageSquare className="h-4 w-4" />
              {openCommentCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] rounded-full h-4 min-w-4 flex items-center justify-center px-1 leading-none font-medium">
                  {openCommentCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFavorite}>
              <Star className={`h-4 w-4 ${page.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
            </Button>
            <ShareDialog pageId={page.id}>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground">
                {visibleAvatars.length > 0 && (
                  <div className="flex items-center -space-x-1.5 mr-0.5">
                    {visibleAvatars.map((profile) => (
                      <Avatar key={profile.id} className="h-5 w-5 border-2 border-background">
                        <AvatarImage src={profile.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[8px] bg-muted">
                          {profile.full_name?.[0]?.toUpperCase() ?? profile.email?.[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {extraCount > 0 && (
                      <span className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-medium text-muted-foreground">
                        +{extraCount}
                      </span>
                    )}
                  </div>
                )}
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Share</span>
              </Button>
            </ShareDialog>
          </>
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
      </div>
    </header>
  );
}
