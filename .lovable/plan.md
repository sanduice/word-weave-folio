

# Add Table to Slash Command Menu

## What Changes

Add a "Table" option to the slash command menu below the existing "Image" item in the Media category. This requires installing the `@tiptap/extension-table` package and integrating it into the editor.

## Corner Cases Handled

- Table inserted with a sensible default size (3 rows x 3 columns with header row)
- Table styles added so cells have visible borders and proper padding inside the editor
- TipTap's table extension handles Tab key navigation between cells, row/column operations, and cell selection out of the box
- Tables work correctly with undo/redo
- Slash menu does not trigger inside table cells (already handled -- slash triggers at start of line or after space)

## Technical Details

### 1. Install `@tiptap/extension-table` (includes Table, TableRow, TableCell, TableHeader)

### 2. Update `src/components/PageEditor.tsx`
- Import `TableKit` from `@tiptap/extension-table` (bundles Table, TableRow, TableCell, TableHeader)
- Add `TableKit` to the editor's extensions array

### 3. Update `src/components/editor/SlashCommandMenu.tsx`
- Import `Table2` icon from lucide-react
- Add a new command item after Image in the Media category:
  - Title: "Table"
  - Description: "Insert a table"
  - Search terms: table, grid, rows, columns
  - Command: `editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()`

### 4. Update `src/index.css`
- Add table styles for the editor's prose area (borders on cells, padding, header row styling)

