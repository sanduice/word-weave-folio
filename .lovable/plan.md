

# Add Rich Text Editor to Todo Detail Panel

## Overview

Replace the plain `<Textarea>` for the todo description with the same TipTap rich-text editor used in PageEditor. This gives todo descriptions the same editing capabilities as pages: slash commands, formatting toolbar, bubble menu, headings, lists, code blocks, tables, etc.

## What Changes

### 1. TodoDetail.tsx -- Replace Textarea with TipTap Editor

The current plain `<Textarea>` for description (lines 197-206) will be replaced with a full TipTap `EditorContent` setup, including:

- **TipTap editor instance** with the same extensions as PageEditor: StarterKit, Placeholder, TaskList, TaskItem, Link, TextStyle, Color, Highlight, SlashCommandExtension, Table extensions
- **Slash command menu** (`<SlashCommandMenu />`) for block insertion via `/`
- **Bubble menu toolbar** (`<BubbleMenuToolbar />`) for selection-based formatting
- **Debounced auto-save** -- saves description HTML to the database after ~1.5s of inactivity (same pattern as PageEditor)

### 2. Auto-save Logic

- The editor's `onUpdate` callback triggers a debounced save of `editor.getHTML()` to the `description` field
- When switching between todos (`selectedTodoId` changes), the editor content reloads and pending saves are cancelled
- The description column already stores TEXT, which will now contain HTML instead of plain text

### 3. Compact Layout Adjustments

Since the detail panel is narrower (400px) than the page editor, the editor will:
- Use a smaller prose class (`prose-sm`)
- Skip the StickyToolbar (the bubble menu provides sufficient formatting access)
- Include SlashCommandMenu for block insertion
- Have a minimum height placeholder area

## Files to Modify

| File | Change |
|---|---|
| `src/components/TodoDetail.tsx` | Replace `<Textarea>` with TipTap editor, add slash commands and bubble menu, add debounced auto-save logic |

## No Database Changes Needed

The `description` column is already `TEXT` type, which can store HTML content. No migration required.

## Technical Details

- Import and configure the same TipTap extensions used in `PageEditor.tsx` (StarterKit, Placeholder, TaskList/TaskItem, Link, TextStyle, Color, Highlight, SlashCommandExtension, Table)
- Use `useEditor` hook with `onUpdate` wired to a debounced save function
- Load content via `editor.commands.setContent()` when `todo.id` or `todo.description` changes
- Cancel pending save timers on todo switch (same pattern as PageEditor's `selectedPageId` cleanup)
- Render `<EditorContent />`, `<SlashCommandMenu />`, and `<BubbleMenuToolbar />` in the description area
- Keep the existing title, properties (status, priority, due date), and delete button unchanged

