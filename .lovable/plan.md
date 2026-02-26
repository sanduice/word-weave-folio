

# Inline Task Title Editing & Continuous Task Creation

## Changes — all in `src/components/TodoListView.tsx`

### 1. Inline editable task titles with hover pen icon
- Track `editingTodoId` and `editingTitle` state
- Replace the static `<span>` for each todo title with: if `editingTodoId === todo.id`, show an `<input>` pre-filled with the title; otherwise show the current `<span>`
- Add a `<Pencil>` icon button next to the title, visible only on hover (`opacity-0 group-hover:opacity-100`), that sets `editingTodoId` to that todo's id
- On Enter or blur, call `updateTodo.mutate({ id, title })` and clear `editingTodoId`
- On Escape, discard changes and clear `editingTodoId`
- Click on the pencil and the input both call `e.stopPropagation()` to avoid triggering row selection

### 2. Continuous task creation on Enter
- Change `handleCommit`: after creating a task, keep `isAddingTask = true` and re-focus the input instead of closing it
- Flow: user presses Enter → task is created → input clears → cursor stays in input ready for next task
- Only close the input on Escape or clicking away (blur)

### Files modified

| File | Change |
|------|--------|
| `src/components/TodoListView.tsx` | Add `editingTodoId`/`editingTitle` state, inline edit input per row, hover Pencil button, and keep input open after Enter |

