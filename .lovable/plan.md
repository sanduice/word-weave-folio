

## Plan: Make todo list header inline-editable with changeable emoji

### Changes to `src/components/TodoListView.tsx`

#### 1. Remove pen icon, delete icon, and subtitle
- Remove the `<Button>` with `<Pencil>` icon (line 151-153)
- Remove the `<Button>` with `<Trash2>` icon (line 154-156)
- Remove the "Stay organized with tasks, your way." paragraph (line 158)

#### 2. Make title inline-editable (click to edit, no pen icon)
- Replace the `<h1>` with an `<Input>` that looks like a heading by default (transparent, no border)
- On focus it becomes editable; on blur/Enter it saves via `updateList.mutate`
- No separate rename state needed — the input IS the title display

#### 3. Make the emoji clickable to change
- Wrap the list icon emoji in the `EmojiPicker` component (already exists at `src/components/editor/EmojiPicker.tsx`)
- On emoji select, call `updateList.mutate({ id: currentList.id, icon: selectedEmoji })`
- The `todo_lists` table already has an `icon` column

### Technical details
- Import `EmojiPicker` from `./editor/EmojiPicker`
- Remove `Pencil`, `Trash2` from lucide imports (Trash2 still used elsewhere — check; actually no, it's only used here, but delete functionality moves to TodoDetail or context menu — for now just remove from header)
- The `isRenaming` / `renameValue` / `renameRef` state can be removed since the title is always an input now

