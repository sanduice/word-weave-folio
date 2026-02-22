import { useEffect, useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { Plus } from "lucide-react";
import { Node as PmNode } from "@tiptap/pm/model";

interface TableControlsProps {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement>;
}

interface ControlPosition {
  addRow: { top: number; left: number; width: number } | null;
  addCol: { top: number; left: number; height: number } | null;
}

interface RowGap {
  rowIndex: number; // insert BEFORE this row index
  top: number;
  left: number;
  width: number;
}

interface ColGap {
  colIndex: number; // insert BEFORE this column index
  top: number;
  left: number;
  height: number;
}

function findTableNodePos(editor: Editor): { tableNode: PmNode; tablePos: number } | null {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d >= 0; d--) {
    if ($from.node(d).type.name === "table") {
      return { tableNode: $from.node(d), tablePos: $from.before(d) };
    }
  }
  return null;
}

function insertRowAt(editor: Editor, tablePos: number, rowIndex: number) {
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table) return;

  const rows: PmNode[] = [];
  table.forEach((r) => rows.push(r));

  // Build an empty row matching column count from first row
  const firstRow = rows[0];
  if (!firstRow) return;
  const cells: PmNode[] = [];
  firstRow.forEach((cell) => {
    const cellType = editor.state.schema.nodes.tableCell;
    const paragraph = editor.state.schema.nodes.paragraph.create();
    cells.push(cellType.create(null, paragraph));
  });

  const newRow = editor.state.schema.nodes.tableRow.create(null, cells);
  rows.splice(rowIndex, 0, newRow);

  const { tr } = editor.state;
  const newTable = table.type.create(table.attrs, rows);
  tr.replaceWith(tablePos, tablePos + table.nodeSize, newTable);
  editor.view.dispatch(tr);
}

function insertColumnAt(editor: Editor, tablePos: number, colIndex: number) {
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table) return;

  const newRows: PmNode[] = [];
  table.forEach((row, _offset, index) => {
    const cells: PmNode[] = [];
    row.forEach((cell) => cells.push(cell));

    const paragraph = editor.state.schema.nodes.paragraph.create();
    // Use tableHeader for header row (first row), tableCell for body
    const isHeader = index === 0;
    const cellType = isHeader
      ? editor.state.schema.nodes.tableHeader
      : editor.state.schema.nodes.tableCell;
    const newCell = cellType.create(null, paragraph);
    cells.splice(colIndex, 0, newCell);
    newRows.push(row.type.create(row.attrs, cells));
  });

  const { tr } = editor.state;
  const newTable = table.type.create(table.attrs, newRows);
  tr.replaceWith(tablePos, tablePos + table.nodeSize, newTable);
  editor.view.dispatch(tr);
}

export function TableControls({ editor, containerRef }: TableControlsProps) {
  const [pos, setPos] = useState<ControlPosition>({ addRow: null, addCol: null });
  const [rowGaps, setRowGaps] = useState<RowGap[]>([]);
  const [colGaps, setColGaps] = useState<ColGap[]>([]);
  const [hovered, setHovered] = useState(false);
  const [hoveredRowGap, setHoveredRowGap] = useState<number | null>(null);
  const [hoveredColGap, setHoveredColGap] = useState<number | null>(null);

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
        setRowGaps([]);
        setColGaps([]);
        return;
      }

      const tableRect = tableEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop;
      const scrollLeft = container.scrollLeft;

      // Find .tableWrapper to clamp positions within visible scroll area
      const wrapperEl = tableEl.closest('.tableWrapper') as HTMLElement | null;
      const wrapperRect = wrapperEl ? wrapperEl.getBoundingClientRect() : tableRect;

      const clampedRight = Math.min(tableRect.right, wrapperRect.right);
      const clampedWidth = Math.min(tableRect.width, wrapperRect.width);

      setPos({
        addRow: {
          top: tableRect.bottom - containerRect.top + scrollTop + 2,
          left: tableRect.left - containerRect.left + scrollLeft,
          width: clampedWidth,
        },
        addCol: {
          top: tableRect.top - containerRect.top + scrollTop,
          left: clampedRight - containerRect.left + scrollLeft + 2,
          height: tableRect.height,
        },
      });

      // Compute row gaps (between rows, starting after header)
      const trs = tableEl.querySelectorAll("tr");
      const rGaps: RowGap[] = [];
      for (let i = 1; i < trs.length; i++) {
        const rect = trs[i].getBoundingClientRect();
        rGaps.push({
          rowIndex: i,
          top: rect.top - containerRect.top + scrollTop - 6,
          left: tableRect.left - containerRect.left + scrollLeft - 28,
          width: clampedWidth,
        });
      }
      setRowGaps(rGaps);

      // Compute column gaps (between columns), clamped to wrapper
      const firstRow = tableEl.querySelector("tr");
      if (firstRow) {
        const cells = firstRow.querySelectorAll("th, td");
        const cGaps: ColGap[] = [];
        for (let i = 1; i < cells.length; i++) {
          const rect = cells[i].getBoundingClientRect();
          // Skip gaps that fall outside the visible wrapper area
          if (rect.left > wrapperRect.right || rect.right < wrapperRect.left) continue;
          cGaps.push({
            colIndex: i,
            top: tableRect.top - containerRect.top + scrollTop - 28,
            left: rect.left - containerRect.left + scrollLeft - 6,
            height: tableRect.height,
          });
        }
        setColGaps(cGaps);
      }
    };

    editor.on("transaction", update);
    editor.on("selectionUpdate", update);
    update();

    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", update);
    }

    return () => {
      editor.off("transaction", update);
      editor.off("selectionUpdate", update);
      container?.removeEventListener("scroll", update);
    };
  }, [editor, containerRef, findTableElement]);

  const handleAddRow = (e: React.MouseEvent) => {
    e.preventDefault();
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

  const handleInsertRowAt = (e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    const info = findTableNodePos(editor);
    if (info) {
      insertRowAt(editor, info.tablePos, rowIndex);
    }
  };

  const handleInsertColAt = (e: React.MouseEvent, colIndex: number) => {
    e.preventDefault();
    const info = findTableNodePos(editor);
    if (info) {
      insertColumnAt(editor, info.tablePos, colIndex);
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

      {/* Between-row insertion indicators */}
      {rowGaps.map((gap) => (
        <div
          key={`row-gap-${gap.rowIndex}`}
          className="table-insert-zone table-insert-zone--row"
          style={{
            top: gap.top,
            left: gap.left,
            width: gap.width + 28,
            height: 12,
          }}
          onMouseEnter={() => setHoveredRowGap(gap.rowIndex)}
          onMouseLeave={() => setHoveredRowGap(null)}
          onMouseDown={(e) => handleInsertRowAt(e, gap.rowIndex)}
          title="Insert row here"
        >
          {hoveredRowGap === gap.rowIndex && (
            <>
              <div className="table-insert-line table-insert-line--row" />
              <div className="table-insert-btn">
                <Plus className="h-3 w-3" />
              </div>
            </>
          )}
        </div>
      ))}

      {/* Between-column insertion indicators */}
      {colGaps.map((gap) => (
        <div
          key={`col-gap-${gap.colIndex}`}
          className="table-insert-zone table-insert-zone--col"
          style={{
            top: gap.top,
            left: gap.left,
            width: 12,
            height: gap.height + 28,
          }}
          onMouseEnter={() => setHoveredColGap(gap.colIndex)}
          onMouseLeave={() => setHoveredColGap(null)}
          onMouseDown={(e) => handleInsertColAt(e, gap.colIndex)}
          title="Insert column here"
        >
          {hoveredColGap === gap.colIndex && (
            <>
              <div className="table-insert-line table-insert-line--col" />
              <div className="table-insert-btn">
                <Plus className="h-3 w-3" />
              </div>
            </>
          )}
        </div>
      ))}
    </>
  );
}
