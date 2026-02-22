

# Todo List Feature -- Complete Requirements

## Overview

A Todo List section in the sidebar (below Pages, above Favorites) that lets users manage tasks per space. Each todo is a lightweight item with a checkbox, title, due date, priority, and status -- persisted in the database.

## Sidebar Integration

- New "Todos" section appears in the sidebar between "Pages" and "Favorites"
- Header row with "Todos" label and a "+" button to add a new task inline
- Each todo item shows: checkbox (toggle done) + title (single line, truncated)
- Two tab-like filters at the top: "To Do" (default) and "Done"
- Clicking a todo selects it and opens a detail panel in the main content area (similar to how selecting a page opens the editor)

## Todo Item Properties

| Property | Type | Details |
|---|---|---|
| Title | text | Required, inline editable |
| Status | enum | `todo`, `in_progress`, `done` |
| Priority | enum | `none`, `low`, `medium`, `high` |
| Due date | date (nullable) | Date picker, shows "Yesterday", "Today", etc. |
| Description | text | Optional rich-text or plain-text body |
| Space | FK to spaces | Todos are scoped per space |
| Sort order | integer | For drag-to-reorder |

## User Interactions

1. **Create**: Click "+" in sidebar header or "+ New task" row at bottom of list -- adds an empty todo in edit mode
2. **Toggle done**: Click the checkbox to mark complete/incomplete (moves between To Do / Done tabs)
3. **Inline rename**: Click on title text to edit in-place (same pattern as page renaming)
4. **Detail view**: Click a todo to open a detail panel showing all properties (due date, status, priority, description)
5. **Delete**: Context menu or detail panel action to delete a todo
6. **Reorder**: Drag-and-drop within the list (same pattern as favorites reordering)

## Detail Panel (Main Area)

When a todo is selected, the main content area shows:
- Large title (editable)
- Property rows: Due date, Status (colored badge), Priority
- Description area (plain text or simple editor)
- The detail panel replaces the page editor (or could be a split view -- but replacing is simpler and matches the reference image)

## Database

### New `todos` table

```
id           UUID PK default gen_random_uuid()
space_id     UUID FK -> spaces(id) ON DELETE CASCADE
user_id      UUID NOT NULL
title        TEXT NOT NULL DEFAULT ''
description  TEXT DEFAULT ''
status       TEXT NOT NULL DEFAULT 'todo'    -- 'todo' | 'in_progress' | 'done'
priority     TEXT NOT NULL DEFAULT 'none'    -- 'none' | 'low' | 'medium' | 'high'
due_date     DATE NULL
sort_order   INTEGER DEFAULT 0
completed_at TIMESTAMPTZ NULL
created_at   TIMESTAMPTZ DEFAULT now()
updated_at   TIMESTAMPTZ DEFAULT now()
```

### RLS Policies

- Users can only SELECT, INSERT, UPDATE, DELETE their own todos (`user_id = auth.uid()`)

## New Files

| File | Purpose |
|---|---|
| `src/hooks/use-todos.ts` | React Query hooks: useTodos, useCreateTodo, useUpdateTodo, useDeleteTodo |
| `src/components/TodoList.tsx` | Sidebar todo list with tabs, items, inline add |
| `src/components/TodoDetail.tsx` | Main area detail view for selected todo |
| `src/components/TodoItem.tsx` | Individual sidebar list item (checkbox + title) |

## Modified Files

| File | Change |
|---|---|
| `src/stores/app-store.ts` | Add `selectedTodoId`, `setSelectedTodoId`, `todoFilter` state |
| `src/components/AppSidebar.tsx` | Add Todos section between Pages and Favorites |
| `src/components/PageEditor.tsx` or `src/pages/Index.tsx` | Conditionally render TodoDetail when a todo is selected instead of PageEditor |

## State Management

- `selectedTodoId` in Zustand store -- when set, the main area shows TodoDetail instead of PageEditor
- Selecting a page clears `selectedTodoId` and vice versa
- `todoFilter: 'todo' | 'done'` controls which tab is active in the sidebar

## Visual Design

- Follows existing sidebar styling (same fonts, spacing, hover states)
- Checkbox: rounded square, filled blue when checked (matching reference)
- Status badge: colored dot + label (green for Done, etc.)
- Due date: calendar icon + relative label
- Priority: optional colored indicator

