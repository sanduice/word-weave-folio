
# Full Table Functionality (Confluence-style)

## Current State

The table inserts correctly via `/table` in the slash menu. However, once a table is in the document there is no way to:
- Add or delete rows / columns
- Merge or split cells
- Delete the whole table
- Toggle a header row

This is because TipTap's table commands (`addRowAfter`, `deleteRow`, etc.) exist in the editor but there is no UI surface to trigger them.

---

## What Will Be Built

### 1. Floating Table Toolbar — `src/components/editor/TableToolbar.tsx` (new file)

A context-sensitive toolbar that appears **above the table** whenever the cursor is anywhere inside it. It disappears automatically when the cursor leaves the table.

Button groups:
- **Rows**: Add Row Above, Add Row Below, Delete Row
- **Columns**: Add Column Left, Add Column Right, Delete Column
- **Cells**: Merge Cells (only enabled when multiple cells are selected), Split Cell
- **Table**: Toggle Header Row, Delete Table

Each button uses a lucide-react icon and shows a tooltip on hover. Disabled state is computed from `editor.can().…()` so buttons that are not applicable (e.g. Merge when nothing is selected) are visually dimmed.

Positioning logic:
- On every editor `transaction`, if the cursor is inside a `tableCell` or `tableHeader` node, find the wrapping `<table>` DOM element using `editor.view.domAtPos()`, call `.getBoundingClientRect()` on it, and position the toolbar absolutely above it relative to the scroll container.
- A thin separator divides the button groups.

### 2. CSS — `src/index.css`

Add styles for:
- `.table-toolbar` — floating bar with `position: absolute`, white background, border, shadow, `z-index: 60`
- `.table-toolbar-group` — flex group of buttons with a right separator
- `.table-toolbar-btn` — icon button with hover + active states, disabled opacity
- `.table-toolbar-divider` — 1 px vertical separator between groups

Also fix/add TipTap table CSS to work both inside `.prose` and directly in `.tiptap` (the current styles only target `.prose table`, but the editor renders as `.tiptap table`):
- Cell borders visible
- Selected cell highlight (`.selectedCell`)
- Header row background

### 3. PageEditor integration — `src/components/PageEditor.tsx`

- Import and render `<TableToolbar editor={editor} containerRef={...} />` below `<EditorContent>` (before the slash command menu)
- Pass a `containerRef` pointing to the scroll container div so the toolbar can calculate its position relative to the scrollable area

### 4. Corner Cases

| Case | How handled |
|------|-------------|
| Cursor not in table | Toolbar hidden (returns null) |
| Only one row left — Delete Row | Button disabled via `editor.can().deleteRow()` |
| Only one column left — Delete Column | Button disabled via `editor.can().deleteColumn()` |
| Nothing multi-selected — Merge | Merge button disabled via `editor.can().mergeCells()` |
| Already split cell — Split | Split button disabled via `editor.can().splitCell()` |
| Table at very top of scroll container | Toolbar positioned below the table instead (fallback) |
| Slash menu inside table cell | Already blocked by existing plugin check in `slash-command.ts` |
| Delete Table removes all rows | `deleteTable()` command removes the entire table node cleanly |
| Undo/redo | All commands go through ProseMirror history automatically |

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/editor/TableToolbar.tsx` | **New** — floating toolbar component |
| `src/index.css` | **Modify** — add toolbar styles + fix `.tiptap table` CSS |
| `src/components/PageEditor.tsx` | **Modify** — render `<TableToolbar>` and pass `containerRef` |

No new packages needed — all TipTap table commands (`addRowBefore`, `addRowAfter`, `addColumnBefore`, `addColumnAfter`, `deleteRow`, `deleteColumn`, `mergeCells`, `splitCell`, `toggleHeaderRow`, `deleteTable`) ship with `@tiptap/extension-table` which is already installed.
