
# Fix: Table Command Not Working (`insertTable is not a function`)

## Root Cause

The error `e.chain(...).focus(...).insertTable is not a function` is caused by a **Gapcursor conflict** between TipTap v3's `StarterKit` and the `TableKit` extension.

- `StarterKit` v3 bundles `Gapcursor` internally (from `@tiptap/extensions`)
- `TableKit` internally adds `Table`, which also registers `Gapcursor` and `tableEditing()` ProseMirror plugins
- TipTap detects the duplicate and silently drops the conflicting extension, meaning the `Table` node (and its `insertTable` command) never gets registered in the editor schema

Because `Table` is never registered, calling `editor.chain().focus().insertTable(...)` throws at runtime.

## The Fix

Replace `TableKit` (the bundled kit) with the **four individual table extensions** (`Table`, `TableRow`, `TableHeader`, `TableCell`) imported directly from `@tiptap/extension-table`. These can coexist with StarterKit because the sub-extensions don't double-register Gapcursor — only the outer `Table` node does, and TipTap resolves this correctly when it's listed explicitly alongside StarterKit.

No new packages are needed. Everything is already in `@tiptap/extension-table`.

## Corner Cases Handled

- Table inserted inside an empty paragraph (standard behavior)
- Table not insertable inside another table (TipTap's schema enforces this)
- Slash menu does not trigger inside table cells (already handled by the existing slash-command plugin — it checks `$from.parent.type.name`)
- Tab key navigates between cells (built into the Table extension's keymap)
- Undo/redo works correctly across table insertions (ProseMirror history)
- Delete key on an empty document with only a table works without crash (Gapcursor handles exit from table)

## Files Changed

### `src/components/PageEditor.tsx`

- **Remove** `import { TableKit } from "@tiptap/extension-table"`
- **Add** `import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table"`
- **Replace** `TableKit` in the extensions array with:
  ```ts
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  ```

That's the only change needed. The slash menu command and CSS styles are already correct.
