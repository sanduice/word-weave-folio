import { useState, useRef } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSpaces } from "@/hooks/use-spaces";
import { usePages, useFavoritePages, useReorderPages } from "@/hooks/use-pages";
import { useFolders, useCreateFolder } from "@/hooks/use-folders";
import { useCreatePage } from "@/hooks/use-pages";
import { useAppStore } from "@/stores/app-store";
import { useSession, useProfile, useLogout } from "@/hooks/use-auth";
import { useSharedPages } from "@/hooks/use-shared-pages";
import { SpaceSelector } from "./SpaceSelector";
import { FolderTree } from "./FolderTree";
import { Button } from "@/components/ui/button";
import { Star, FileText, FilePlus, FolderPlus, GripVertical, LogOut, ChevronUp, Home, Search, SquarePen, Users } from "lucide-react";
import { TodoList } from "./TodoList";
import { useEffect } from "react";

const displayTitle = (title: string) => title?.trim() || "New page";

export function AppSidebar() {
  const {
    selectedSpaceId, setSelectedSpaceId, setSelectedPageId, selectedPageId,
    goHome, selectedTodoListId, setSearchOpen,
  } = useAppStore();
  const { data: spaces } = useSpaces();
  const { data: pages } = usePages(selectedSpaceId ?? undefined);
  const { data: folders } = useFolders(selectedSpaceId ?? undefined);
  const { data: favorites } = useFavoritePages();
  const reorder = useReorderPages();
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const logout = useLogout();
  const createPage = useCreatePage();
  const createFolder = useCreateFolder();
  const { data: sharedPages } = useSharedPages();

  // Auto-select first space once data loads
  useEffect(() => {
    if (!selectedSpaceId && spaces && spaces.length > 0) {
      setSelectedSpaceId(spaces[0].id);
    }
  }, [spaces, selectedSpaceId, setSelectedSpaceId]);

  // Favorites drag state
  const [favLocalOrder, setFavLocalOrder] = useState<string[] | null>(null);
  const favDraggedId = useRef<string | null>(null);
  const [favDropState, setFavDropState] = useState<{ id: string; pos: "before" | "after" } | null>(null);

  const orderedFavorites = favLocalOrder && favorites
    ? favLocalOrder.map((id) => favorites.find((f) => f.id === id)!).filter(Boolean)
    : (favorites ?? []);

  function handleFavDragStart(e: React.DragEvent, id: string) {
    favDraggedId.current = id;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleFavDragOver(e: React.DragEvent, id: string, el: HTMLElement) {
    e.preventDefault();
    if (favDraggedId.current === id) return;
    const rect = el.getBoundingClientRect();
    const pos: "before" | "after" = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setFavDropState({ id, pos });
  }

  function handleFavDrop(e: React.DragEvent, targetId: string, el: HTMLElement) {
    e.preventDefault();
    const dropped = favDraggedId.current;
    setFavDropState(null);
    if (!dropped || dropped === targetId || !favorites) return;

    const base = favLocalOrder
      ? favLocalOrder.map((id) => favorites.find((f) => f.id === id)!).filter(Boolean)
      : [...favorites];

    const without = base.filter((f) => f.id !== dropped);
    const targetIdx = without.findIndex((f) => f.id === targetId);
    if (targetIdx === -1) return;

    const rect = el.getBoundingClientRect();
    const pos: "before" | "after" = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    const insertAt = pos === "before" ? targetIdx : targetIdx + 1;
    without.splice(insertAt, 0, base.find((f) => f.id === dropped)!);

    const newOrder = without.map((f) => f.id);
    setFavLocalOrder(newOrder);

    const updates = without.map((f, i) => ({ id: f.id, sort_order: i + 1 }));
    reorder.mutate(updates, {
      onError: () => setFavLocalOrder(null),
      onSuccess: () => setFavLocalOrder(null),
    });
    favDraggedId.current = null;
  }

  function handleFavDragEnd() {
    setFavDropState(null);
    favDraggedId.current = null;
  }

  function handleNewPage() {
    if (!selectedSpaceId) return;
    createPage.mutate({ space_id: selectedSpaceId, title: "" }, {
      onSuccess: (page) => setSelectedPageId(page.id),
    });
  }

  function handleNewFolder() {
    if (!selectedSpaceId) return;
    createFolder.mutate({ space_id: selectedSpaceId });
  }

  const isEmpty = !pages?.length && !folders?.length;

  return (
    <Sidebar className="border-r border-sidebar-border">
      {/* Header: Active space as dropdown + quick create */}
      <SidebarHeader className="px-2 py-3">
        <div className="flex items-center gap-1">
          <SpaceSelector
            spaces={spaces ?? []}
            selectedId={selectedSpaceId}
            onSelect={setSelectedSpaceId}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewPage}
            title="New page"
            className="shrink-0 h-7 w-7"
          >
            <SquarePen className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Search + Home quick actions */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setSearchOpen(true)}
                  className="text-sm text-muted-foreground"
                >
                  <Search className="h-4 w-4" />
                  Search
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={!selectedPageId && !selectedTodoListId}
                  onClick={goHome}
                  className="text-sm"
                >
                  <Home className="h-4 w-4" />
                  Home
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Todo lists */}
        <TodoList />

        {/* Pages + Folders tree */}
        <SidebarGroup className="flex-1">
          <div className="flex items-center justify-between px-2 pr-1">
            <SidebarGroupLabel className="text-xs text-sidebar-foreground/50 px-0">
              Pages
            </SidebarGroupLabel>
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" onClick={handleNewPage} title="New page" className="h-6 w-6">
                <FilePlus className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNewFolder} title="New folder" className="h-6 w-6">
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <SidebarGroupContent>
            {isEmpty ? (
              <p className="px-4 py-2 text-xs text-muted-foreground">No pages yet</p>
            ) : (
              <FolderTree
                folders={folders ?? []}
                pages={pages ?? []}
                selectedPageId={selectedPageId}
                onSelectPage={setSelectedPageId}
                spaceId={selectedSpaceId ?? ""}
              />
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Favorites */}
        {favorites && favorites.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-sidebar-foreground/50">
              <Star className="h-3 w-3 mr-1" />
              Favorites
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {orderedFavorites.map((page) => {
                  const dropCls =
                    favDropState?.id === page.id
                      ? favDropState.pos === "before"
                        ? "border-t-2 border-primary"
                        : "border-b-2 border-primary"
                      : "";
                  const titleIsEmpty = !page.title?.trim();
                  return (
                    <SidebarMenuItem key={page.id}>
                      <div
                        className={`flex items-center w-full group rounded ${dropCls}`}
                        draggable
                        onDragStart={(e) => handleFavDragStart(e, page.id)}
                        onDragOver={(e) => handleFavDragOver(e, page.id, e.currentTarget as HTMLElement)}
                        onDrop={(e) => handleFavDrop(e, page.id, e.currentTarget as HTMLElement)}
                        onDragLeave={() => setFavDropState(null)}
                        onDragEnd={handleFavDragEnd}
                      >
                        <span className="p-1 opacity-0 group-hover:opacity-40 cursor-grab shrink-0">
                          <GripVertical className="h-3 w-3" />
                        </span>
                        <SidebarMenuButton
                          isActive={selectedPageId === page.id}
                          onClick={() => {
                            setSelectedSpaceId(page.space_id);
                            setSelectedPageId(page.id);
                          }}
                          className="text-sm flex-1"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className={`truncate ${titleIsEmpty ? "italic text-muted-foreground/50" : ""}`}>
                            {displayTitle(page.title)}
                          </span>
                        </SidebarMenuButton>
                      </div>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Shared with me */}
        {sharedPages && sharedPages.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-sidebar-foreground/50">
              <Users className="h-3 w-3 mr-1" />
              Shared with me
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sharedPages.map((shared) => {
                  const pg = shared.page;
                  if (!pg) return null;
                  const titleIsEmpty = !pg.title?.trim();
                  return (
                    <SidebarMenuItem key={shared.id}>
                      <SidebarMenuButton
                        isActive={selectedPageId === pg.id}
                        onClick={() => {
                          setSelectedSpaceId(pg.space_id);
                          setSelectedPageId(pg.id);
                        }}
                        className="text-sm"
                      >
                        {pg.icon_value ? (
                          <span className="text-sm shrink-0">{pg.icon_value}</span>
                        ) : (
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className={`truncate ${titleIsEmpty ? "italic text-muted-foreground/50" : ""}`}>
                          {pg.title?.trim() || "New page"}
                        </span>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 p-2 h-auto w-full justify-start cursor-pointer">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {profile?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-sidebar-foreground">
                  {profile?.full_name ?? user?.email ?? "User"}
                </p>
                {profile?.email && (
                  <p className="text-[10px] text-muted-foreground truncate">{profile.email}</p>
                )}
              </div>
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuItem onClick={logout} className="gap-2 text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
