import { useEffect, useRef, useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { Plus } from "lucide-react";

interface TableControlsProps {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement>;
}

interface ControlPosition {
  addRow: { top: number; left: number; width: number } | null;
  addCol: { top: number; left: number; height: number } | null;
}

export function TableControls({ editor, containerRef }: TableControlsProps) {
  const [pos, setPos] = useState<ControlPosition>({ addRow: null, addCol: null });
  const [hovered, setHovered] = useState(false);

  const findTableElement = useCallback((): HTMLElement | null => {
    const { selection } = editor.state;
    const { $from } = selection;

    let inTable = false;
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        inTable = true;
        break;
      }
    }
    if (!inTable) return null;

    try {
      const domPos = editor.view.domAtPos($from.pos);
      let el = domPos.node as HTMLElement;
      if (el.nodeType === Node.TEXT_NODE) el = el.parentElement as HTMLElement;
      let tableEl: HTMLElement | null = el;
      while (tableEl && tableEl.tagName !== "TABLE") {
        tableEl = tableEl.parentElement;
      }
      return tableEl;
    } catch {
      return null;
    }
  }, [editor]);

  useEffect(() => {
    const update = () => {
      const tableEl = findTableElement();
      const container = containerRef.current;
      if (!tableEl || !container) {
        setPos({ addRow: null, addCol: null });
        return;
      }

      const tableRect = tableEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop;
      const scrollLeft = container.scrollLeft;

      setPos({
        addRow: {
          top: tableRect.bottom - containerRect.top + scrollTop + 2,
          left: tableRect.left - containerRect.left + scrollLeft,
          width: tableRect.width,
        },
        addCol: {
          top: tableRect.top - containerRect.top + scrollTop,
          left: tableRect.right - containerRect.left + scrollLeft + 2,
          height: tableRect.height,
        },
      });
    };

    editor.on("transaction", update);
    editor.on("selectionUpdate", update);
    update();

    return () => {
      editor.off("transaction", update);
      editor.off("selectionUpdate", update);
    };
  }, [editor, containerRef, findTableElement]);

  const handleAddRow = (e: React.MouseEvent) => {
    e.preventDefault();
    // Move to last cell then add row
    const { doc } = editor.state;
    let lastCellPos: number | null = null;
    doc.descendants((node, pos) => {
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        lastCellPos = pos + 1;
      }
    });
    if (lastCellPos !== null) {
      editor.chain().focus().setTextSelection(lastCellPos).addRowAfter().run();
    }
  };

  const handleAddCol = (e: React.MouseEvent) => {
    e.preventDefault();
    // Move to last header/cell in first row then add column
    const { doc } = editor.state;
    let lastHeaderPos: number | null = null;
    let foundFirstRow = false;
    doc.descendants((node, pos) => {
      if (node.type.name === "tableRow") {
        if (foundFirstRow) return false;
        foundFirstRow = true;
      }
      if (foundFirstRow && (node.type.name === "tableHeader" || node.type.name === "tableCell")) {
        lastHeaderPos = pos + 1;
      }
    });
    if (lastHeaderPos !== null) {
      editor.chain().focus().setTextSelection(lastHeaderPos).addColumnAfter().run();
    }
  };

  if (!pos.addRow && !pos.addCol) return null;

  return (
    <>
      {/* Add Row button - below table */}
      {pos.addRow && (
        <button
          className="absolute flex items-center justify-center gap-1 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity duration-150 rounded-b-md border border-t-0 border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground z-10"
          style={{
            top: pos.addRow.top,
            left: pos.addRow.left,
            width: pos.addRow.width,
            height: 24,
            ...(hovered ? { opacity: 1 } : {}),
          }}
          onMouseDown={handleAddRow}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          title="Add row"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Add Column button - right of table */}
      {pos.addCol && (
        <button
          className="absolute flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity duration-150 rounded-r-md border border-l-0 border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground z-10"
          style={{
            top: pos.addCol.top,
            left: pos.addCol.left,
            width: 24,
            height: pos.addCol.height,
          }}
          onMouseDown={handleAddCol}
          title="Add column"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </>
  );
}
