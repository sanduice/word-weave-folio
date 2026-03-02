

## Plan: Fix todo/page title styling — remove outline, allow wrapping

### Changes

#### 1. Replace `<Input>` with `<textarea>` for both titles
Both titles use `<Input>` (single-line `<input>`), which forces single-line display and shows a focus outline. Replace with auto-resizing `<textarea>` elements.

#### `src/components/TodoListView.tsx` (line ~135)
- Replace `<Input>` with a `<textarea>` that auto-resizes to content
- Add `rows={1}`, `overflow-hidden`, `resize-none` to prevent scrollbar
- Keep existing classes: `text-4xl font-bold bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0`
- Add `outline-none` to remove any remaining focus outline
- Auto-resize on input via a small effect or `onInput` handler that sets `style.height`

#### `src/components/PageEditor.tsx` (line ~408)
- Same change: replace `<Input>` with auto-resizing `<textarea>`
- Same styling approach

### Technical details
- Use a shared pattern: `onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}` for auto-resize
- Handle Enter key to prevent newlines (blur or move focus to editor instead)
- `focus-visible:ring-0 focus-visible:ring-offset-0 outline-none` removes all focus indicators

