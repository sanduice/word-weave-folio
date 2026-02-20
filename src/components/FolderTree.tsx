import { useRef } from "react";
import { SidebarMenuItem, SidebarMenuButton, SidebarMenu } from "@/components/ui/sidebar";
import { ChevronRight, FileText, GripVertical } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FolderItem, type DragState } from "./FolderItem";
import type { Folder } from "@/hooks/use-folders";
import { useReorderFolders, useUpdateFolder } from "@/hooks/use-folders";
import { useReorderPages, useUpdatePage } from "@/hooks/use-pages";
import type { Page } from "@/hooks/use-pages";

const displayTitle = (title: string) => title?.trim() || "Untitled";

interface FolderTreeProps {
  folders: Folder[];
  pages: Page[];
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  spaceId: string;
}

export function FolderTree({ folders, pages, selectedPageId, onSelectPage, spaceId }: FolderTreeProps) {
  const dragState: DragState = {
    draggedId: useRef<string | null>(null),
    draggedType: useRef<"folder" | "page" | null>(null),
  };

  const reorderFolders = useReorderFolders();
  const reorderPages = useReorderPages();
  const updateFolder = useUpdateFolder();
  const updatePage = useUpdatePage();

  function handleReorder(
    srcId: string,
    srcType: "folder" | "page",
    targetId: string,
    targetType: "folder" | "page",
    position: "before" | "after" | "into"
  ) {
    // Drop INTO a folder → reparent
    if (position === "into" && targetType === "folder") {
      if (srcType === "folder") {
        updateFolder.mutate({ id: srcId, parent_folder_id: targetId });
      } else {
        updatePage.mutate({ id: srcId, folder_id: targetId, parent_id: null });
      }
      return;
    }

    // Sibling reorder at same level — determine parent context from target
    const targetFolder = folders.find((f) => f.id === targetId);
    const targetPage = pages.find((p) => p.id === targetId);

    const targetParentFolderId = targetFolder?.parent_folder_id ?? targetPage?.folder_id ?? null;

    if (srcType === "folder") {
      // Move folder to same parent level as target
      updateFolder.mutate({ id: srcId, parent_folder_id: targetParentFolderId });
    } else {
      // Move page to same folder level as target
      updatePage.mutate({ id: srcId, folder_id: targetParentFolderId, parent_id: null });
    }

    // Reorder items at the same parent level (mixed items share sort_order space)
    // Collect all siblings at the target level
    const siblingFolders = folders.filter((f) => (f.parent_folder_id ?? null) === targetParentFolderId);
    const siblingPages = pages.filter((p) => (p.folder_id ?? null) === targetParentFolderId && !p.parent_id);

    // Build a mixed list sorted by existing sort_order
    type MixedItem = { id: string; type: "folder" | "page"; sort_order: number | null };
    const mixed: MixedItem[] = [
      ...siblingFolders.map((f) => ({ id: f.id, type: "folder" as const, sort_order: f.sort_order })),
      ...siblingPages.map((p) => ({ id: p.id, type: "page" as const, sort_order: p.sort_order ?? null })),
    ].sort((a, b) => {
      if (a.sort_order == null && b.sort_order == null) return 0;
      if (a.sort_order == null) return 1;
      if (b.sort_order == null) return -1;
      return a.sort_order - b.sort_order;
    });

    // Insert src at correct position relative to target
    const withoutSrc = mixed.filter((m) => m.id !== srcId);
    const tIdx = withoutSrc.findIndex((m) => m.id === targetId);
    if (tIdx === -1) return;
    const insertAt = position === "before" ? tIdx : tIdx + 1;
    const srcItem: MixedItem = { id: srcId, type: srcType, sort_order: null };
    withoutSrc.splice(insertAt, 0, srcItem);

    // Push sort_order updates
    const folderUpdates: { id: string; sort_order: number }[] = [];
    const pageUpdates: { id: string; sort_order: number }[] = [];
    withoutSrc.forEach((item, i) => {
      if (item.type === "folder") folderUpdates.push({ id: item.id, sort_order: i + 1 });
      else pageUpdates.push({ id: item.id, sort_order: i + 1 });
    });

    if (folderUpdates.length > 0) reorderFolders.mutate(folderUpdates);
    if (pageUpdates.length > 0) reorderPages.mutate(pageUpdates);
  }

  // Renders all items (folders + root pages) under a given parentFolderId
  function renderLevel(
    parentFolderId: string | null,
    depth: number,
    ds: DragState,
    onReorder: typeof handleReorder
  ): React.ReactNode {
    const levelFolders = folders.filter((f) => (f.parent_folder_id ?? null) === parentFolderId);
    const levelPages = pages.filter((p) => (p.folder_id ?? null) === parentFolderId && !p.parent_id);

    // Mixed sort
    type MixedItem =
      | { kind: "folder"; data: Folder; sort_order: number | null }
      | { kind: "page"; data: Page; sort_order: number | null };

    const mixed: MixedItem[] = [
      ...levelFolders.map((f) => ({ kind: "folder" as const, data: f, sort_order: f.sort_order })),
      ...levelPages.map((p) => ({ kind: "page" as const, data: p, sort_order: p.sort_order ?? null })),
    ].sort((a, b) => {
      if (a.sort_order == null && b.sort_order == null) return 0;
      if (a.sort_order == null) return 1;
      if (b.sort_order == null) return -1;
      return a.sort_order - b.sort_order;
    });

    return mixed.map((item) => {
      if (item.kind === "folder") {
        return (
          <FolderItem
            key={`folder-${item.data.id}`}
            folder={item.data}
            folders={folders}
            pages={pages}
            selectedPageId={selectedPageId}
            onSelectPage={onSelectPage}
            depth={depth}
            dragState={ds}
            onReorder={onReorder}
            spaceId={spaceId}
            renderChildren={renderLevel}
          />
        );
      } else {
        return (
          <PageItem
            key={`page-${item.data.id}`}
            page={item.data}
            pages={pages}
            selectedPageId={selectedPageId}
            onSelectPage={onSelectPage}
            depth={depth}
            dragState={ds}
            onReorder={onReorder}
          />
        );
      }
    });
  }

  return (
    <SidebarMenu>
      {renderLevel(null, 0, dragState, handleReorder)}
    </SidebarMenu>
  );
}

// ── Page item (leaf or collapsible if it has sub-pages via parent_id) ─────────

function PageItem({
  page,
  pages,
  selectedPageId,
  onSelectPage,
  depth,
  dragState,
  onReorder,
}: {
  page: Page;
  pages: Page[];
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  depth: number;
  dragState: DragState;
  onReorder: (
    srcId: string,
    srcType: "folder" | "page",
    targetId: string,
    targetType: "folder" | "page",
    position: "before" | "after" | "into"
  ) => void;
}) {
  const [open, setOpen] = useState(true);
  const [dropState, setDropState] = useState<"before" | "after" | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const children = pages.filter((p) => p.parent_id === page.id);
  const hasChildren = children.length > 0;

  function getPos(e: React.DragEvent, el: HTMLElement): "before" | "after" {
    const rect = el.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2 ? "before" : "after";
  }

  function handleDragStart(e: React.DragEvent) {
    dragState.draggedId.current = page.id;
    dragState.draggedType.current = "page";
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("id", page.id);
    e.dataTransfer.setData("type", "page");
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!itemRef.current || dragState.draggedId.current === page.id) return;
    setDropState(getPos(e, itemRef.current));
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!itemRef.current?.contains(e.relatedTarget as Node)) setDropState(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const srcId = dragState.draggedId.current;
    const srcType = dragState.draggedType.current;
    const pos = dropState;
    setDropState(null);
    if (!srcId || !srcType || !pos || !itemRef.current) return;
    if (srcId === page.id) return;
    onReorder(srcId, srcType, page.id, "page", pos);
    dragState.draggedId.current = null;
    dragState.draggedType.current = null;
  }

  function handleDragEnd() {
    setDropState(null);
  }

  const dropCls =
    dropState === "before" ? "border-t-2 border-primary" :
    dropState === "after" ? "border-b-2 border-primary" : "";

  const titleEmpty = !page.title?.trim();

  const rowContent = (
    <div
      ref={itemRef}
      className={`flex items-center w-full group rounded ${dropCls}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      style={{ paddingLeft: depth > 0 ? `${depth * 8}px` : undefined }}
    >
      <span className="p-1 opacity-0 group-hover:opacity-40 cursor-grab shrink-0">
        <GripVertical className="h-3 w-3" />
      </span>
      {hasChildren ? (
        <CollapsibleTrigger asChild>
          <button className="p-1 hover:bg-sidebar-accent rounded shrink-0">
            <ChevronRight className={`h-3 w-3 transition-transform text-muted-foreground ${open ? "rotate-90" : ""}`} />
          </button>
        </CollapsibleTrigger>
      ) : (
        <span className="w-5 shrink-0" />
      )}
      <SidebarMenuButton
        isActive={selectedPageId === page.id}
        onClick={() => onSelectPage(page.id)}
        className="text-sm flex-1"
      >
        <FileText className="h-3.5 w-3.5 shrink-0" />
        <span className={`truncate ${titleEmpty ? "italic text-muted-foreground/50" : ""}`} title={page.title}>
          {displayTitle(page.title)}
        </span>
      </SidebarMenuButton>
    </div>
  );

  if (hasChildren) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <SidebarMenuItem>{rowContent}</SidebarMenuItem>
        <CollapsibleContent>
          <div className="ml-4 border-l border-sidebar-border pl-1">
            <SidebarMenu>
              {children.map((child) => (
                <PageItem
                  key={child.id}
                  page={child}
                  pages={pages}
                  selectedPageId={selectedPageId}
                  onSelectPage={onSelectPage}
                  depth={depth + 1}
                  dragState={dragState}
                  onReorder={onReorder}
                />
              ))}
            </SidebarMenu>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return <SidebarMenuItem>{rowContent}</SidebarMenuItem>;
}
