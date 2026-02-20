import { useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  RowsIcon,
  Rows2,
  Trash2,
  Columns2,
  Columns3,
  Merge,
  Split,
  LayoutList,
  TableIcon,
  Eraser,
  PaintBucket,
} from "lucide-react";

interface TableToolbarProps {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement>;
}

interface ToolbarButton {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  canDo: () => boolean;
  destructive?: boolean;
}

interface ToolbarGroup {
  label: string;
  buttons: ToolbarButton[];
}

export function TableToolbar({ editor, containerRef }: TableToolbarProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      const { selection, doc } = editor.state;
      const { $from } = selection;

      // Check if cursor is inside a table cell or header
      let inTable = false;
      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d);
        if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
          inTable = true;
          break;
        }
      }

      if (!inTable) {
        setPosition(null);
        return;
      }

      // Find the table DOM element
      try {
        const domPos = editor.view.domAtPos($from.pos);
        let el = domPos.node as HTMLElement;
        if (el.nodeType === Node.TEXT_NODE) {
          el = el.parentElement as HTMLElement;
        }
        // Walk up to find the <table>
        let tableEl: HTMLElement | null = el;
        while (tableEl && tableEl.tagName !== "TABLE") {
          tableEl = tableEl.parentElement;
        }
        if (!tableEl || !containerRef.current) {
          setPosition(null);
          return;
        }

        const tableRect = tableEl.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const scrollTop = containerRef.current.scrollTop;

        const TOOLBAR_HEIGHT = 40;
        const MARGIN = 6;
        let top = tableRect.top - containerRect.top + scrollTop - TOOLBAR_HEIGHT - MARGIN;

        // Fallback: if table is at the very top, place toolbar below
        if (top < scrollTop) {
          top = tableRect.bottom - containerRect.top + scrollTop + MARGIN;
        }

        const left = tableRect.left - containerRect.left;
        setPosition({ top, left });
      } catch {
        setPosition(null);
      }
    };

    editor.on("transaction", updatePosition);
    editor.on("selectionUpdate", updatePosition);
    updatePosition();

    return () => {
      editor.off("transaction", updatePosition);
      editor.off("selectionUpdate", updatePosition);
    };
  }, [editor, containerRef]);

  if (!position) return null;

  const groups: ToolbarGroup[] = [
    {
      label: "Rows",
      buttons: [
        {
          label: "Add Row Above",
          icon: <RowsIcon className="h-3.5 w-3.5" />,
          action: () => editor.chain().focus().addRowBefore().run(),
          canDo: () => editor.can().addRowBefore(),
        },
        {
          label: "Add Row Below",
          icon: <Rows2 className="h-3.5 w-3.5" />,
          action: () => editor.chain().focus().addRowAfter().run(),
          canDo: () => editor.can().addRowAfter(),
        },
        {
          label: "Delete Row",
          icon: <Trash2 className="h-3.5 w-3.5" />,
          action: () => editor.chain().focus().deleteRow().run(),
          canDo: () => editor.can().deleteRow(),
          destructive: true,
        },
      ],
    },
    {
      label: "Columns",
      buttons: [
        {
          label: "Add Column Left",
          icon: <Columns2 className="h-3.5 w-3.5" />,
          action: () => editor.chain().focus().addColumnBefore().run(),
          canDo: () => editor.can().addColumnBefore(),
        },
        {
          label: "Add Column Right",
          icon: <Columns3 className="h-3.5 w-3.5" />,
          action: () => editor.chain().focus().addColumnAfter().run(),
          canDo: () => editor.can().addColumnAfter(),
        },
        {
          label: "Delete Column",
          icon: <Trash2 className="h-3.5 w-3.5" />,
          action: () => editor.chain().focus().deleteColumn().run(),
          canDo: () => editor.can().deleteColumn(),
          destructive: true,
        },
      ],
    },
    {
      label: "Cells",
      buttons: [
        {
          label: "Merge Cells",
          icon: <Merge className="h-3.5 w-3.5" />,
          action: () => editor.chain().focus().mergeCells().run(),
          canDo: () => editor.can().mergeCells(),
        },
        {
          label: "Split Cell",
          icon: <Split className="h-3.5 w-3.5" />,
          action: () => editor.chain().focus().splitCell().run(),
          canDo: () => editor.can().splitCell(),
        },
      ],
    },
    {
      label: "Table",
      buttons: [
        {
          label: "Toggle Header Row",
          icon: <LayoutList className="h-3.5 w-3.5" />,
          action: () => editor.chain().focus().toggleHeaderRow().run(),
          canDo: () => editor.can().toggleHeaderRow(),
        },
        {
          label: "Delete Table",
          icon: <TableIcon className="h-3.5 w-3.5" />,
          action: () => editor.chain().focus().deleteTable().run(),
          canDo: () => editor.can().deleteTable(),
          destructive: true,
        },
      ],
    },
  ];

  const CELL_COLORS = [
    { label: "None", value: null },
    { label: "Red", value: "#fee2e2" },
    { label: "Orange", value: "#ffedd5" },
    { label: "Yellow", value: "#fef9c3" },
    { label: "Green", value: "#dcfce7" },
    { label: "Teal", value: "#ccfbf1" },
    { label: "Blue", value: "#dbeafe" },
    { label: "Purple", value: "#f3e8ff" },
    { label: "Grey", value: "#f3f4f6" },
  ];

  return (
    <TooltipProvider delayDuration={400}>
      <div
        ref={toolbarRef}
        className="table-toolbar"
        style={{ top: position.top, left: position.left }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {groups.map((group, gi) => (
          <div key={group.label} className="table-toolbar-group">
            {gi > 0 && <div className="table-toolbar-divider" />}
            {group.buttons.map((btn) => {
              const disabled = !btn.canDo();
              return (
                <Tooltip key={btn.label}>
                  <TooltipTrigger asChild>
                    <button
                      className={`table-toolbar-btn${btn.destructive ? " table-toolbar-btn-danger" : ""}`}
                      onClick={btn.action}
                      disabled={disabled}
                      aria-label={btn.label}
                    >
                      {btn.icon}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {btn.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}

        {/* Cell background color group */}
        <div className="table-toolbar-divider" />
        <div className="table-toolbar-group">
          <Tooltip>
            <TooltipTrigger asChild>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="table-toolbar-btn"
                    aria-label="Cell background color"
                  >
                    <PaintBucket className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-auto"
                  sideOffset={6}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="p-2 grid grid-cols-3 gap-1" style={{ width: 116 }}>
                    {CELL_COLORS.map((c) => (
                      <button
                        key={c.label}
                        title={c.label}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          editor
                            .chain()
                            .focus()
                            .setCellAttribute("backgroundColor", c.value)
                            .run();
                        }}
                        className="w-8 h-8 rounded hover:scale-110 transition-transform flex items-center justify-center"
                        style={{
                          background: c.value ?? "transparent",
                          border: c.value
                            ? "1px solid hsl(var(--border))"
                            : "1px dashed hsl(var(--muted-foreground))",
                        }}
                      >
                        {!c.value && (
                          <span className="text-muted-foreground text-xs">∅</span>
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Cell background color
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="table-toolbar-btn"
                onClick={() => editor.chain().focus().clearContent().run()}
                aria-label="Clear cell content"
              >
                <Eraser className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Clear cell content
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
