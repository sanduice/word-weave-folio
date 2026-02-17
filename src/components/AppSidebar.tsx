import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useSpaces } from "@/hooks/use-spaces";
import { usePages, useFavoritePages, useRecentPages } from "@/hooks/use-pages";
import { useAppStore } from "@/stores/app-store";
import { SpaceSelector } from "./SpaceSelector";
import { PageTree } from "./PageTree";
import { Plus, Star, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { selectedSpaceId, setSelectedSpaceId, setSelectedPageId, selectedPageId } = useAppStore();
  const { data: spaces } = useSpaces();
  const { data: pages } = usePages(selectedSpaceId ?? undefined);
  const { data: favorites } = useFavoritePages();
  const { data: recents } = useRecentPages();

  // Auto-select first space
  useEffect(() => {
    if (!selectedSpaceId && spaces && spaces.length > 0) {
      setSelectedSpaceId(spaces[0].id);
    }
  }, [spaces, selectedSpaceId, setSelectedSpaceId]);

  const rootPages = useMemo(() => {
    if (!pages) return [];
    return pages.filter((p) => !p.parent_id);
  }, [pages]);

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <span className="font-semibold text-base text-sidebar-foreground tracking-tight">Notespace</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Space selector */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60">
            Space
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SpaceSelector
              spaces={spaces ?? []}
              selectedId={selectedSpaceId}
              onSelect={setSelectedSpaceId}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Page tree */}
        <SidebarGroup className="flex-1">
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60 px-0">
              Pages
            </SidebarGroupLabel>
          </div>
          <SidebarGroupContent>
            {rootPages.length === 0 ? (
              <p className="px-4 py-2 text-xs text-muted-foreground">No pages yet</p>
            ) : (
              <SidebarMenu>
                <PageTree
                  pages={pages ?? []}
                  rootPages={rootPages}
                  selectedPageId={selectedPageId}
                  onSelect={setSelectedPageId}
                  depth={0}
                />
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Favorites */}
        {favorites && favorites.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60">
              <Star className="h-3 w-3 mr-1" />
              Favorites
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {favorites.map((page) => (
                  <SidebarMenuItem key={page.id}>
                    <SidebarMenuButton
                      isActive={selectedPageId === page.id}
                      onClick={() => {
                        setSelectedSpaceId(page.space_id);
                        setSelectedPageId(page.id);
                      }}
                      className="text-sm"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{page.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Recents */}
        {recents && recents.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60">
              <Clock className="h-3 w-3 mr-1" />
              Recent
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {recents.map((r) => {
                  const page = r.pages as any;
                  if (!page) return null;
                  return (
                    <SidebarMenuItem key={r.id}>
                      <SidebarMenuButton
                        isActive={selectedPageId === page.id}
                        onClick={() => {
                          setSelectedSpaceId(page.space_id);
                          setSelectedPageId(page.id);
                        }}
                        className="text-sm"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{page.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <p className="text-[10px] text-muted-foreground/40 text-center">Notespace v1</p>
      </SidebarFooter>
    </Sidebar>
  );
}
