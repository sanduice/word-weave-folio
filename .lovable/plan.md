

# Multiple Todo Lists Per Space

## Overview
Add the ability to create multiple named todo lists within each space (e.g. "Work", "Personal", "Sprint 1"). Each list contains its own set of tasks. Users can switch between lists in the sidebar and main view.

## Database Changes

### New table: `todo_lists`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| space_id | uuid | — | FK to spaces |
| user_id | uuid | — | For RLS |
| name | text | 'Untitled List' | |
| icon | text | '📋' | Emoji icon |
| sort_order | integer | 0 | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

RLS: Same pattern as other tables — users can only CRUD their own rows.

### Modify `todos` table
- Add column `todo_list_id` (uuid, nullable initially for migration, then required)
- Migrate existing todos: create a default "Todo List" per space that has todos, assign existing todos to it

## Code Changes

### 1. New hook: `src/hooks/use-todo-lists.ts`
- `useTodoLists(spaceId)` — fetch all lists for a space
- `useCreateTodoList()` — create a new list
- `useUpdateTodoList()` — rename, reorder
- `useDeleteTodoList()` — delete list (and its todos)

### 2. Update `src/hooks/use-todos.ts`
- Change `useTodos` to accept `todoListId` instead of `spaceId`
- Filter todos by `todo_list_id`

### 3. Update `src/stores/app-store.ts`
- Add `selectedTodoListId` state and setter
- When selecting a space, reset `selectedTodoListId`

### 4. Update sidebar (`src/components/AppSidebar.tsx`)
- Replace single "Todos" section with a list of todo lists under each space
- Each list item is clickable to open that list's view
- Add "+" button to create a new todo list
- Allow renaming lists (double-click or context menu)

### 5. Update `src/components/TodoListView.tsx`
- Show the selected todo list's name as the heading
- Filter todos by `selectedTodoListId` instead of space
- Add a dropdown or breadcrumb showing which list is active

### 6. Update `src/components/TodoList.tsx` (sidebar component)
- Show all todo lists for the current space
- Each list is a clickable item that sets `selectedTodoListId`

### 7. Update `src/components/TodoDetail.tsx`
- No major changes needed — still works on individual todo items

## Migration Strategy
1. Create `todo_lists` table with RLS
2. Add `todo_list_id` column to `todos` (nullable)
3. SQL migration function: for each space with existing todos, create a default list and assign todos to it
4. After migration, consider adding a NOT NULL constraint

