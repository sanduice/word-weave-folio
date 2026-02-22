

# Drag-to-Reorder and Drag-to-Remove for Table Rows and Columns

## Overview

Add Notion-style drag handles to table rows and columns that allow users to reorder by dragging, and remove by dragging outside the table boundary. This builds on the existing `TableControls` component and table CSS.

## Approach

Since TipTap has no built-in drag-to-reorder for rows/columns, we build a custom React overlay component that:
- Renders drag grip handles on hover (6-dot icon)
- Uses pointer events (not HTML5 drag API) for smoother control
- Manipulates ProseMirror document structure via transactions to swap rows/columns
- Detects drops outside table bounds for removal

## New Component: `TableDragControls`

**File: `src/components/editor/TableDragControls.tsx` (new)**

This component renders:
1. **Row drag handles**: A 6-dot grip icon on the left side of each row, visible on hover
2. **Column drag handles**: A 6-dot grip icon above each column header, visible on hover
3. **Drop indicators**: A horizontal line (for rows) or vertical line (for columns) showing where the item will land
4. **Delete zone indicator**: A red highlight when dragging outside the table boundary

### Row Reorder Logic

```text
[grip] | Cell 1 | Cell 2 | Cell 3 |   <-- drag this grip
       |--------|--------|--------|
       | Cell 4 | Cell 5 | Cell 6 |   <-- drop indicator line appears here
       |--------|--------|--------|
       | Cell 7 | Cell 8 | Cell 9 |
```

- On pointer down on a row grip: capture the row index and start tracking
- On pointer move: calculate which row gap the pointer is nearest to, show a blue insertion line
- On pointer up inside table: execute a ProseMirror transaction that removes the row from its old position and inserts it at the new position
- On pointer up outside table (vertically): show delete confirmation, then remove the row

The ProseMirror transaction for row reorder:
1. Find the table node in the document
2. Get the row node at the source index
3. Create a new table node with rows reordered
4. Replace the old table node with the new one using `tr.replaceWith()`

### Column Reorder Logic

```text
       [grip]   [grip]   [grip]
       | Col 1 | Col 2 | Col 3 |
       |--------|--------|--------|
       | Cell 4 | Cell 5 | Cell 6 |
```

- Similar pointer event tracking but horizontal
- On drop: for each row in the table, swap the cells at the source and target column indices
- This is done in a single ProseMirror transaction that rebuilds all rows with swapped cell positions

### Drag-to-Remove

- When the pointer moves more than 60px outside the table boundary (up/down for rows, left/right for columns):
  - Show a red "remove" indicator on the dragged item
  - On pointer up: use `editor.chain().focus().deleteRow()` or `deleteColumn()`
  - Guard against removing the last row or last column (show a toast warning instead)

## Component Integration

**File: `src/components/PageEditor.tsx`**

- Import and render `TableDragControls` alongside the existing `TableControls` and `TableToolbar`
- Pass `editor` and `containerRef` props (same pattern as existing table components)

## Styling

**File: `src/index.css`**

Add styles for:
- `.table-drag-handle`: the grip icon container (positioned absolutely left of rows / above columns)
- `.table-drag-indicator`: the blue insertion line shown during drag
- `.table-drag-delete-zone`: red overlay when dragging outside bounds
- `.table-row-dragging`: opacity reduction on the row being dragged

```css
/* Drag handle grip */
.table-drag-handle {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  cursor: grab;
  opacity: 0;
  transition: opacity 0.15s;
  color: hsl(var(--muted-foreground));
  border-radius: 0.25rem;
  z-index: 5;
}

.table-drag-handle:hover,
.table-drag-handle:active {
  opacity: 1;
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}

/* Show handles when hovering table */
.tiptap .tableWrapper:hover .table-drag-handle {
  opacity: 0.4;
}

/* Drop indicator line */
.table-drag-indicator {
  position: absolute;
  background: hsl(var(--primary));
  z-index: 10;
  pointer-events: none;
  border-radius: 1px;
}

/* Row indicator: horizontal line */
.table-drag-indicator--row {
  height: 2px;
  left: 0;
}

/* Column indicator: vertical line */
.table-drag-indicator--col {
  width: 2px;
  top: 0;
}

/* Delete zone visual */
.table-drag-delete-indicator {
  position: absolute;
  background: hsl(var(--destructive) / 0.1);
  border: 1px dashed hsl(var(--destructive) / 0.5);
  border-radius: 0.25rem;
  z-index: 10;
  pointer-events: none;
}
```

## Technical Details

### Finding Table Structure in ProseMirror

The component needs to map DOM positions to ProseMirror node positions:

1. Find the table node: walk up from current selection to find `table` node type
2. Get row positions: iterate table children (each is a `tableRow`)
3. Get column count: count cells in first row
4. For each row/column, get the DOM element via `editor.view.nodeDOM(pos)` to calculate handle positions

### Row Reorder Transaction

```typescript
function reorderRow(editor: Editor, tablePos: number, fromIndex: number, toIndex: number) {
  const { tr } = editor.state;
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table) return;

  const rows: Node[] = [];
  table.forEach((row) => rows.push(row));

  // Remove from old position, insert at new
  const [moved] = rows.splice(fromIndex, 1);
  rows.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved);

  // Build new table node
  const newTable = table.type.create(table.attrs, rows);
  tr.replaceWith(tablePos, tablePos + table.nodeSize, newTable);
  editor.view.dispatch(tr);
}
```

### Column Reorder Transaction

```typescript
function reorderColumn(editor: Editor, tablePos: number, fromCol: number, toCol: number) {
  const { tr } = editor.state;
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table) return;

  const newRows: Node[] = [];
  table.forEach((row) => {
    const cells: Node[] = [];
    row.forEach((cell) => cells.push(cell));
    const [moved] = cells.splice(fromCol, 1);
    cells.splice(toCol > fromCol ? toCol - 1 : toCol, 0, moved);
    newRows.push(row.type.create(row.attrs, cells));
  });

  const newTable = table.type.create(table.attrs, newRows);
  tr.replaceWith(tablePos, tablePos + table.nodeSize, newTable);
  editor.view.dispatch(tr);
}
```

### Position Tracking

The component recalculates handle positions on:
- Editor `transaction` events (content changes)
- Editor `selectionUpdate` events
- Container scroll events
- Pointer move during active drag

Positions are calculated relative to the `containerRef` (same pattern as `TableControls` and `TableToolbar`).

### Edge Cases

- **Dragging header row**: Prevented -- the first row (header) cannot be reordered
- **Single row/column**: Cannot remove the last row or last column -- show toast warning
- **Scroll during drag**: Handle positions update during drag via scroll listener
- **Undo/redo**: All reorder and remove operations go through ProseMirror transactions, so they are automatically part of the undo history

## Files Summary

| File | Change |
|---|---|
| `src/components/editor/TableDragControls.tsx` | New component: drag handles, reorder logic, remove logic |
| `src/components/PageEditor.tsx` | Import and render `TableDragControls` |
| `src/index.css` | Drag handle, indicator, and delete zone styles |

