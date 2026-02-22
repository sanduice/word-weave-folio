

# Fix New Task Behavior: Bottom Placement + Inline Creation

## Issues

1. **New tasks appear at the top** because the query orders by `created_at DESC`. They should appear at the bottom.
2. **Clicking "New task" should show an inline editable input** right where the button is, rather than immediately creating a database row and opening the drawer.

## Changes

### 1. Fix sort order (`src/hooks/use-todos.ts`)

Change the query's `created_at` order from `descending: false` (which means DESC) to `ascending: true` so newer tasks appear at the bottom of the list.

### 2. Add inline "New task" input (`src/components/TodoListView.tsx`)

- Add a state variable `isAddingTask` (boolean) and `newTaskTitle` (string)
- When the user clicks "New task" (bottom row) or the "New" button, instead of immediately calling `createTodo`, set `isAddingTask = true`
- The bottom "New task" row transforms into an inline input field (checkbox + text input) with auto-focus
- Pressing **Enter** or clicking away (blur) commits: creates the todo with the typed title, appends it to the bottom, and resets the input
- Pressing **Escape** cancels and hides the input
- Remove the top "New task" row -- keep only the bottom one for a cleaner layout
- After creation, the new task appears at the bottom of the list (due to the sort order fix)

### 3. Files to modify

| File | Change |
|---|---|
| `src/hooks/use-todos.ts` | Change `created_at` order to ascending so new items appear at bottom |
| `src/components/TodoListView.tsx` | Replace bottom NewTaskRow with inline input; remove top NewTaskRow; add `isAddingTask` state logic |

