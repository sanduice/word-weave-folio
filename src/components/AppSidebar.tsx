import { useState, useEffect, useRef } from "react";
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
import { SpaceSelector } from "./SpaceSelector";
import { FolderTree } from "./FolderTree";
import { Star, FileText, FilePlus, FolderPlus, GripVertical, LogOut, ChevronUp, ListTodo } from "lucide-react";

const displayTitle = (title: string) => title?.trim() || "Untitled";

export function AppSidebar() {
  const { selectedSpaceId, setSelectedSpaceId, setSelectedPageId, selectedPageId, viewMode, setViewMode } = useAppStore();
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

        {/* Todos nav link */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={viewMode === "todos"}
                  onClick={() => setViewMode("todos")}
                  className="text-sm"
                >
                  <ListTodo className="h-3.5 w-3.5 shrink-0" />
                  <span>Todos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Pages + Folders tree */}
        <SidebarGroup className="flex-1">
          <div className="flex items-center justify-between px-2 pr-1">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60 px-0">
              Pages
            </SidebarGroupLabel>
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleNewPage}
                title="New page"
                className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <FilePlus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleNewFolder}
                title="New folder"
                className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
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
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60">
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
      </SidebarContent>

      <SidebarFooter className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-sidebar-accent w-full text-left transition-colors cursor-pointer">
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
            </button>
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
