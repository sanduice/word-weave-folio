import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { ChevronRight, FileText, GripVertical } from "lucide-react";
import { useState, useRef } from "react";
import type { Page } from "@/hooks/use-pages";
import { useReorderPages } from "@/hooks/use-pages";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const displayTitle = (title: string) => title?.trim() || "Untitled";

interface PageTreeProps {
  pages: Page[];
  rootPages: Page[];
  selectedPageId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}

export function PageTree({ pages, rootPages, selectedPageId, onSelect, depth }: PageTreeProps) {
  const reorder = useReorderPages();
  // Optimistic local order
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
}: {
  page: Page;
  pages: Page[];
  selectedPageId: string | null;
  onSelect: (id: string) => void;
  depth: number;
  draggedId: React.MutableRefObject<string | null>;
  onReorder: (draggedId: string, targetId: string, position: "before" | "after") => void;
}) {
  const [open, setOpen] = useState(true);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const children = pages.filter((p) => p.parent_id === page.id);
  const hasChildren = children.length > 0;
  const maxExpandDepth = 3;

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

  const dropIndicatorClass = dropPosition === "before"
    ? "border-t-2 border-primary"
    : dropPosition === "after"
    ? "border-b-2 border-primary"
    : "";

  const titleIsEmpty = !page.title?.trim();

  if (hasChildren && depth < maxExpandDepth) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <SidebarMenuItem>
          <div
            ref={itemRef}
            className={`flex items-center w-full group rounded ${dropIndicatorClass}`}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          >
            <span className="p-1 opacity-0 group-hover:opacity-40 cursor-grab shrink-0">
              <GripVertical className="h-3 w-3" />
            </span>
            <CollapsibleTrigger asChild>
              <button className="p-1 hover:bg-sidebar-accent rounded shrink-0">
                <ChevronRight
                  className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
                />
              </button>
            </CollapsibleTrigger>
            <SidebarMenuButton
              isActive={selectedPageId === page.id}
              onClick={() => onSelect(page.id)}
              className="text-sm flex-1"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className={`truncate ${titleIsEmpty ? "italic text-muted-foreground/50" : ""}`}>
                {displayTitle(page.title)}
              </span>
            </SidebarMenuButton>
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
    );
  }

  return (
    <SidebarMenuItem>
      <div
        ref={itemRef}
        className={`flex items-center w-full group rounded ${dropIndicatorClass}`}
        style={{ paddingLeft: hasChildren ? 0 : "0" }}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      >
        <span className="p-1 opacity-0 group-hover:opacity-40 cursor-grab shrink-0">
          <GripVertical className="h-3 w-3" />
        </span>
        <span className="w-4 shrink-0" />
        <SidebarMenuButton
          isActive={selectedPageId === page.id}
          onClick={() => onSelect(page.id)}
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
}
