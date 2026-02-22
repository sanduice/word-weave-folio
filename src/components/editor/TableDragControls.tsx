import { useEffect, useRef, useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { GripVertical } from "lucide-react";
import { Node as PmNode } from "@tiptap/pm/model";
import { toast } from "sonner";

interface TableDragControlsProps {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement>;
}

interface RowHandle {
  index: number;
  top: number;
  left: number;
  height: number;
}

interface ColHandle {
  index: number;
  top: number;
  left: number;
  width: number;
}

interface DragState {
  type: "row" | "col";
  index: number;
  startX: number;
  startY: number;
  active: boolean;
}

interface IndicatorPos {
  type: "row" | "col";
  top: number;
  left: number;
  width?: number;
  height?: number;
}

function findTableInfo(editor: Editor) {
  const { selection } = editor.state;
  const { $from } = selection;

  // Walk up to find the table node
  for (let d = $from.depth; d >= 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "table") {
      return { tableNode: node, tablePos: $from.before(d) };
    }
  }
  return null;
}

function getTableDomElement(editor: Editor): HTMLElement | null {
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
    while (el && el.tagName !== "TABLE") el = el.parentElement as HTMLElement;
    return el;
  } catch {
    return null;
  }
}

function reorderRow(editor: Editor, tablePos: number, fromIndex: number, toIndex: number) {
  const { tr } = editor.state;
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table) return;

  const rows: PmNode[] = [];
  table.forEach((row) => rows.push(row));

  if (fromIndex < 0 || fromIndex >= rows.length || toIndex < 0 || toIndex >= rows.length) return;
  if (fromIndex === toIndex) return;

  const [moved] = rows.splice(fromIndex, 1);
  rows.splice(toIndex, 0, moved);

  const newTable = table.type.create(table.attrs, rows);
  tr.replaceWith(tablePos, tablePos + table.nodeSize, newTable);
  editor.view.dispatch(tr);
}

function reorderColumn(editor: Editor, tablePos: number, fromCol: number, toCol: number) {
  const { tr } = editor.state;
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table) return;

  if (fromCol === toCol) return;

  const newRows: PmNode[] = [];
  table.forEach((row) => {
    const cells: PmNode[] = [];
    row.forEach((cell) => cells.push(cell));
    if (fromCol < 0 || fromCol >= cells.length || toCol < 0 || toCol >= cells.length) return;
    const [moved] = cells.splice(fromCol, 1);
    cells.splice(toCol, 0, moved);
    newRows.push(row.type.create(row.attrs, cells));
  });

  const newTable = table.type.create(table.attrs, newRows);
  tr.replaceWith(tablePos, tablePos + table.nodeSize, newTable);
  editor.view.dispatch(tr);
}

function deleteRowByIndex(editor: Editor, tablePos: number, rowIndex: number) {
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table) return;

  const rows: PmNode[] = [];
  table.forEach((r) => rows.push(r));

  if (rows.length <= 1) {
    toast.warning("Cannot remove the last row");
    return;
  }

  rows.splice(rowIndex, 1);
  const { tr } = editor.state;
  const newTable = table.type.create(table.attrs, rows);
  tr.replaceWith(tablePos, tablePos + table.nodeSize, newTable);
  editor.view.dispatch(tr);
}

function deleteColumnByIndex(editor: Editor, tablePos: number, colIndex: number) {
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table) return;

  // Check column count from first row
  let colCount = 0;
  table.firstChild?.forEach(() => colCount++);
  if (colCount <= 1) {
    toast.warning("Cannot remove the last column");
    return;
  }

  const newRows: PmNode[] = [];
  table.forEach((row) => {
    const cells: PmNode[] = [];
    row.forEach((cell) => cells.push(cell));
    cells.splice(colIndex, 1);
    newRows.push(row.type.create(row.attrs, cells));
  });

  const { tr } = editor.state;
  const newTable = table.type.create(table.attrs, newRows);
  tr.replaceWith(tablePos, tablePos + table.nodeSize, newTable);
  editor.view.dispatch(tr);
}

const DELETE_THRESHOLD = 60;

export function TableDragControls({ editor, containerRef }: TableDragControlsProps) {
  const [rowHandles, setRowHandles] = useState<RowHandle[]>([]);
  const [colHandles, setColHandles] = useState<ColHandle[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [indicator, setIndicator] = useState<IndicatorPos | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tableRect, setTableRect] = useState<DOMRect | null>(null);

  const dragRef = useRef(drag);
  dragRef.current = drag;
  const rowHandlesRef = useRef(rowHandles);
  rowHandlesRef.current = rowHandles;
  const colHandlesRef = useRef(colHandles);
  colHandlesRef.current = colHandles;
  const tableRectRef = useRef(tableRect);
  tableRectRef.current = tableRect;

  const computeHandles = useCallback(() => {
    const tableEl = getTableDomElement(editor);
    const container = containerRef.current;
    if (!tableEl || !container) {
      setRowHandles([]);
      setColHandles([]);
      setTableRect(null);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;
    const scrollLeft = container.scrollLeft;
    const tRect = tableEl.getBoundingClientRect();
    setTableRect(tRect);

    // Row handles
    const tbodies = tableEl.querySelectorAll("tr");
    const rh: RowHandle[] = [];
    tbodies.forEach((tr, i) => {
      const rect = tr.getBoundingClientRect();
      rh.push({
        index: i,
        top: rect.top - containerRect.top + scrollTop,
        left: tRect.left - containerRect.left + scrollLeft - 24,
        height: rect.height,
      });
    });
    setRowHandles(rh);

    // Column handles from first row cells
    const firstRow = tableEl.querySelector("tr");
    if (firstRow) {
      const cells = firstRow.querySelectorAll("th, td");
      const ch: ColHandle[] = [];
      cells.forEach((cell, i) => {
        const rect = cell.getBoundingClientRect();
        ch.push({
          index: i,
          top: tRect.top - containerRect.top + scrollTop - 24,
          left: rect.left - containerRect.left + scrollLeft,
          width: rect.width,
        });
      });
      setColHandles(ch);
    }
  }, [editor, containerRef]);

  useEffect(() => {
    editor.on("transaction", computeHandles);
    editor.on("selectionUpdate", computeHandles);
    computeHandles();

    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", computeHandles);
    }

    return () => {
      editor.off("transaction", computeHandles);
      editor.off("selectionUpdate", computeHandles);
      container?.removeEventListener("scroll", computeHandles);
    };
  }, [editor, containerRef, computeHandles]);

  // Pointer move/up handlers during drag
  useEffect(() => {
    if (!drag?.active) return;

    const container = containerRef.current;
    if (!container) return;

    const onPointerMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d?.active) return;

      const containerRect = container.getBoundingClientRect();
      const tRect = tableRectRef.current;

      if (d.type === "row") {
        // Check if outside table vertically
        const distOutside = tRect
          ? Math.max(0, tRect.top - e.clientY, e.clientY - tRect.bottom)
          : 0;
        setIsDeleting(distOutside > DELETE_THRESHOLD);

        if (distOutside <= DELETE_THRESHOLD) {
          // Find insertion index
          const handles = rowHandlesRef.current;
          const mouseY = e.clientY - containerRect.top + container.scrollTop;
          let targetIndex = handles.length;
          for (let i = 0; i < handles.length; i++) {
            const mid = handles[i].top + handles[i].height / 2;
            if (mouseY < mid) {
              targetIndex = i;
              break;
            }
          }

          // Show indicator
          const indicatorY = targetIndex < handles.length
            ? handles[targetIndex].top
            : handles[handles.length - 1].top + handles[handles.length - 1].height;

          setIndicator({
            type: "row",
            top: indicatorY,
            left: tRect ? tRect.left - containerRect.left + container.scrollLeft : 0,
            width: tRect?.width ?? 200,
          });
        } else {
          setIndicator(null);
        }
      } else {
        // Column drag
        const distOutside = tRect
          ? Math.max(0, tRect.left - e.clientX, e.clientX - tRect.right)
          : 0;
        setIsDeleting(distOutside > DELETE_THRESHOLD);

        if (distOutside <= DELETE_THRESHOLD) {
          const handles = colHandlesRef.current;
          const mouseX = e.clientX - containerRect.left + container.scrollLeft;
          let targetIndex = handles.length;
          for (let i = 0; i < handles.length; i++) {
            const mid = handles[i].left + handles[i].width / 2;
            if (mouseX < mid) {
              targetIndex = i;
              break;
            }
          }

          const indicatorX = targetIndex < handles.length
            ? handles[targetIndex].left
            : handles[handles.length - 1].left + handles[handles.length - 1].width;

          setIndicator({
            type: "col",
            top: tRect ? tRect.top - containerRect.top + container.scrollTop : 0,
            left: indicatorX,
            height: tRect?.height ?? 100,
          });
        } else {
          setIndicator(null);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d?.active) return;

      const tRect = tableRectRef.current;
      const info = findTableInfo(editor);

      if (info) {
        if (d.type === "row") {
          const distOutside = tRect
            ? Math.max(0, tRect.top - e.clientY, e.clientY - tRect.bottom)
            : 0;

          if (distOutside > DELETE_THRESHOLD) {
            deleteRowByIndex(editor, info.tablePos, d.index);
          } else {
            const containerRect = container.getBoundingClientRect();
            const mouseY = e.clientY - containerRect.top + container.scrollTop;
            const handles = rowHandlesRef.current;
            let targetIndex = handles.length;
            for (let i = 0; i < handles.length; i++) {
              const mid = handles[i].top + handles[i].height / 2;
              if (mouseY < mid) {
                targetIndex = i;
                break;
              }
            }
            // Adjust target for the removed source
            const adjustedTarget = targetIndex > d.index ? targetIndex - 1 : targetIndex;
            if (adjustedTarget !== d.index) {
              reorderRow(editor, info.tablePos, d.index, adjustedTarget);
            }
          }
        } else {
          const distOutside = tRect
            ? Math.max(0, tRect.left - e.clientX, e.clientX - tRect.right)
            : 0;

          if (distOutside > DELETE_THRESHOLD) {
            deleteColumnByIndex(editor, info.tablePos, d.index);
          } else {
            const containerRect = container.getBoundingClientRect();
            const mouseX = e.clientX - containerRect.left + container.scrollLeft;
            const handles = colHandlesRef.current;
            let targetIndex = handles.length;
            for (let i = 0; i < handles.length; i++) {
              const mid = handles[i].left + handles[i].width / 2;
              if (mouseX < mid) {
                targetIndex = i;
                break;
              }
            }
            const adjustedTarget = targetIndex > d.index ? targetIndex - 1 : targetIndex;
            if (adjustedTarget !== d.index) {
              reorderColumn(editor, info.tablePos, d.index, adjustedTarget);
            }
          }
        }
      }

      setDrag(null);
      setIndicator(null);
      setIsDeleting(false);
      document.body.style.cursor = "";
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.body.style.cursor = "grabbing";

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.body.style.cursor = "";
    };
  }, [drag?.active, editor, containerRef]);

  const startRowDrag = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    // Prevent dragging the header row (index 0)
    if (index === 0) return;
    setDrag({ type: "row", index, startX: e.clientX, startY: e.clientY, active: true });
  };

  const startColDrag = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    setDrag({ type: "col", index, startX: e.clientX, startY: e.clientY, active: true });
  };

  if (rowHandles.length === 0 && colHandles.length === 0) return null;

  return (
    <>
      {/* Row drag handles */}
      {rowHandles.map((rh) => (
        <div
          key={`row-${rh.index}`}
          className={`table-drag-handle ${rh.index === 0 ? "table-drag-handle--disabled" : ""} ${
            drag?.active && drag.type === "row" && drag.index === rh.index ? "table-drag-handle--active" : ""
          }`}
          style={{
            top: rh.top,
            left: rh.left,
            height: rh.height,
            width: 20,
          }}
          onPointerDown={(e) => startRowDrag(e, rh.index)}
          title={rh.index === 0 ? "Header row" : "Drag to reorder or remove row"}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      ))}

      {/* Column drag handles */}
      {colHandles.map((ch) => (
        <div
          key={`col-${ch.index}`}
          className={`table-drag-handle table-drag-handle--horizontal ${
            drag?.active && drag.type === "col" && drag.index === ch.index ? "table-drag-handle--active" : ""
          }`}
          style={{
            top: ch.top,
            left: ch.left,
            width: ch.width,
            height: 20,
          }}
          onPointerDown={(e) => startColDrag(e, ch.index)}
          title="Drag to reorder or remove column"
        >
          <GripVertical className="h-3.5 w-3.5 rotate-90" />
        </div>
      ))}

      {/* Drop indicator */}
      {indicator && (
        <div
          className={`table-drag-indicator ${
            indicator.type === "row" ? "table-drag-indicator--row" : "table-drag-indicator--col"
          }`}
          style={{
            top: indicator.top - 1,
            left: indicator.left,
            ...(indicator.type === "row" ? { width: indicator.width } : { height: indicator.height }),
          }}
        />
      )}

      {/* Delete zone visual - highlight the dragged row/col in red */}
      {drag?.active && isDeleting && drag.type === "row" && rowHandles[drag.index] && (
        <div
          className="table-drag-delete-indicator"
          style={{
            top: rowHandles[drag.index].top,
            left: rowHandles[drag.index].left,
            width: (tableRect?.width ?? 200) + 24,
            height: rowHandles[drag.index].height,
          }}
        />
      )}
      {drag?.active && isDeleting && drag.type === "col" && colHandles[drag.index] && (
        <div
          className="table-drag-delete-indicator"
          style={{
            top: colHandles[drag.index].top,
            left: colHandles[drag.index].left,
            width: colHandles[drag.index].width,
            height: (tableRect?.height ?? 100) + 24,
          }}
        />
      )}
    </>
  );
}
