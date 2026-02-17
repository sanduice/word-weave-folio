import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { ChevronRight, FileText } from "lucide-react";
import { useState } from "react";
import type { Page } from "@/hooks/use-pages";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PageTreeProps {
  pages: Page[];
  rootPages: Page[];
  selectedPageId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}

export function PageTree({ pages, rootPages, selectedPageId, onSelect, depth }: PageTreeProps) {
  return (
    <>
      {rootPages.map((page) => (
        <PageTreeItem
          key={page.id}
          page={page}
          pages={pages}
          selectedPageId={selectedPageId}
          onSelect={onSelect}
          depth={depth}
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
}: {
  page: Page;
  pages: Page[];
  selectedPageId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  const children = pages.filter((p) => p.parent_id === page.id);
  const hasChildren = children.length > 0;
  const maxExpandDepth = 3;

  if (hasChildren && depth < maxExpandDepth) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <SidebarMenuItem>
          <div className="flex items-center w-full">
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
              <span className="truncate">{page.title}</span>
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
      <div className="flex items-center w-full" style={{ paddingLeft: hasChildren ? 0 : "1.25rem" }}>
        <SidebarMenuButton
          isActive={selectedPageId === page.id}
          onClick={() => onSelect(page.id)}
          className="text-sm"
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{page.title}</span>
        </SidebarMenuButton>
      </div>
    </SidebarMenuItem>
  );
}
