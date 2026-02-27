import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, FileText, GripVertical, MoreHorizontal, Pencil, Copy, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Page } from "@/hooks/use-pages";
import { useReorderPages, useUpdatePage, useDeletePage, useDuplicatePage } from "@/hooks/use-pages";
import { useAppStore } from "@/stores/app-store";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const displayTitle = (title: string) => title?.trim() || "New page";

interface PageTreeProps {
  pages: Page[];
  rootPages: Page[];
  selectedPageId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}

export function PageTree({ pages, rootPages, selectedPageId, onSelect, depth }: PageTreeProps) {
  const reorder = useReorderPages();
  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();
  const duplicatePage = useDuplicatePage();
  const setSelectedPageId = useAppStore((s) => s.setSelectedPageId);

  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const draggedId = useRef<string | null>(null);

  const orderedPages = localOrder
    ? localOrder.map((id) => rootPages.find((p) => p.id === id)!).filter(Boolean)
    : rootPages;

  function handleReorder(draggedPageId: string, targetPageId: string, position: "before" | "after") {
    if (draggedPageId === targetPageId) return;
    const base = localOrder
      ? localOrder.map((id) => rootPages.find((p) => p.id === id)!).filter(Boolean)
      : [...rootPages];
    const without = base.filter((p) => p.id !== draggedPageId);
    const targetIdx = without.findIndex((p) => p.id === targetPageId);
    if (targetIdx === -1) return;
    const insertAt = position === "before" ? targetIdx : targetIdx + 1;
    without.splice(insertAt, 0, base.find((p) => p.id === draggedPageId)!);
    const newOrder = without.map((p) => p.id);
    setLocalOrder(newOrder);
    const updates = without.map((p, i) => ({ id: p.id, sort_order: i + 1 }));
    reorder.mutate(updates, {
      onError: () => setLocalOrder(null),
      onSuccess: () => setLocalOrder(null),
    });
  }

  function handleRename(pageId: string, newTitle: string) {
    updatePage.mutate({ id: pageId, title: newTitle });
  }

  function handleDuplicate(pageId: string) {
    duplicatePage.mutate(pageId, {
      onSuccess: (newPage) => {
        setSelectedPageId(newPage.id);
        onSelect(newPage.id);
      },
    });
  }

  function handleDelete(pageId: string) {
    const isSelected = useAppStore.getState().selectedPageId === pageId;
    deletePage.mutate(pageId, {
      onSuccess: () => {
        if (isSelected) setSelectedPageId(null);
      },
    });
  }

  return (
    <>
      {orderedPages.map((page) => (
        <PageTreeItem
          key={page.id}
          page={page}
          pages={pages}
          selectedPageId={selectedPageId}
          onSelect={onSelect}
          depth={depth}
          draggedId={draggedId}
          onReorder={handleReorder}
          onRename={handleRename}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
      ))}
    </>
  );
}

function PageTreeItem({
  page,
  pages,
  selectedPageId,
  onSelect,
  depth,
  draggedId,
  onReorder,
  onRename,
  onDuplicate,
  onDelete,
}: {
  page: Page;
  pages: Page[];
  selectedPageId: string | null;
  onSelect: (id: string) => void;
  depth: number;
  draggedId: React.MutableRefObject<string | null>;
  onReorder: (draggedId: string, targetId: string, position: "before" | "after") => void;
  onRename: (pageId: string, newTitle: string) => void;
  onDuplicate: (pageId: string) => void;
  onDelete: (pageId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(page.title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const children = pages.filter((p) => p.parent_id === page.id);
  const hasChildren = children.length > 0;
  const maxExpandDepth = 3;

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  function startRename() {
    setRenameValue(page.title);
    setIsRenaming(true);
  }

  function commitRename() {
    setIsRenaming(false);
    if (renameValue !== page.title) {
      onRename(page.id, renameValue);
    }
  }

  function cancelRename() {
    setIsRenaming(false);
    setRenameValue(page.title);
  }

  function getDropPosition(e: React.DragEvent, el: HTMLElement): "before" | "after" {
    const rect = el.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    return e.clientY < midY ? "before" : "after";
  }

  function handleDragStart(e: React.DragEvent) {
    draggedId.current = page.id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", page.id);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!itemRef.current || draggedId.current === page.id) return;
    setDropPosition(getDropPosition(e, itemRef.current));
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!itemRef.current?.contains(e.relatedTarget as Node)) {
      setDropPosition(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = draggedId.current;
    setDropPosition(null);
    if (!dropped || dropped === page.id || !itemRef.current) return;
    const pos = getDropPosition(e, itemRef.current);
    onReorder(dropped, page.id, pos);
    draggedId.current = null;
  }

  function handleDragEnd() {
    setDropPosition(null);
    draggedId.current = null;
  }

  const dropIndicatorClass =
    dropPosition === "before"
      ? "border-t-2 border-primary"
      : dropPosition === "after"
      ? "border-b-2 border-primary"
      : "";

  const titleIsEmpty = !page.title?.trim();

  const titleContent = isRenaming ? (
    <Input
      ref={renameInputRef}
      value={renameValue}
      onChange={(e) => setRenameValue(e.target.value)}
      onBlur={commitRename}
      onKeyDown={(e) => {
        if (e.key === "Enter") commitRename();
        if (e.key === "Escape") cancelRename();
      }}
      className="text-sm md:text-sm h-6 min-w-0"
      onClick={(e) => e.stopPropagation()}
    />
  ) : (
    <span className={`truncate ${titleIsEmpty ? "italic text-muted-foreground/50" : ""}`}>
      {displayTitle(page.title)}
    </span>
  );

  const actionMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover/page-item:opacity-100 shrink-0 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={4} className="w-36">
        <DropdownMenuItem onClick={() => startRename()}>
          <Pencil className="h-3.5 w-3.5 mr-2" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDuplicate(page.id)}>
          <Copy className="h-3.5 w-3.5 mr-2" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setShowDeleteDialog(true)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const deleteDialog = (
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{displayTitle(page.title)}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onDelete(page.id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (hasChildren && depth < maxExpandDepth) {
    return (
      <>
        {deleteDialog}
        <Collapsible open={open} onOpenChange={setOpen}>
          <SidebarMenuItem>
            <div
              ref={itemRef}
              className={`flex items-center w-full group/page-item rounded min-w-0 ${dropIndicatorClass}`}
              draggable={!isRenaming}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            >
              <span className="p-1 opacity-0 group-hover/page-item:opacity-40 cursor-grab shrink-0">
                <GripVertical className="h-3 w-3" />
              </span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0">
                  <ChevronRight
                    className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <SidebarMenuButton
                isActive={selectedPageId === page.id}
                onClick={() => !isRenaming && onSelect(page.id)}
                className="text-sm flex-1 min-w-0 w-auto overflow-hidden"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                {titleContent}
              </SidebarMenuButton>
              {actionMenu}
            </div>
          </SidebarMenuItem>
          <CollapsibleContent>
            <div className="ml-3 border-l border-sidebar-border pl-1">
              <PageTree
                pages={pages}
                rootPages={children}
                selectedPageId={selectedPageId}
                onSelect={onSelect}
                depth={depth + 1}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </>
    );
  }

  return (
    <>
      {deleteDialog}
      <SidebarMenuItem>
        <div
          ref={itemRef}
          className={`flex items-center w-full group/page-item rounded min-w-0 ${dropIndicatorClass}`}
          draggable={!isRenaming}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
        >
          <span className="p-1 opacity-0 group-hover/page-item:opacity-40 cursor-grab shrink-0">
            <GripVertical className="h-3 w-3" />
          </span>
          <span className="w-4 shrink-0" />
          <SidebarMenuButton
            isActive={selectedPageId === page.id}
            onClick={() => !isRenaming && onSelect(page.id)}
            className="text-sm flex-1 min-w-0 w-auto overflow-hidden"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            {titleContent}
          </SidebarMenuButton>
          {actionMenu}
        </div>
      </SidebarMenuItem>
    </>
  );
}
