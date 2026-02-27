

## Plan: Increase Page and Todo header font sizes

Current sizes are `text-3xl` (~30px). Bump to `text-4xl` (~36px) for a more prominent look.

### Files to change

| File | Change |
|------|--------|
| `src/components/PageEditor.tsx` | Title input: `text-3xl md:text-3xl` → `text-4xl md:text-4xl` |
| `src/components/TodoListView.tsx` | Rename input: `text-3xl md:text-3xl` → `text-4xl md:text-4xl` |
| `src/components/TodoListView.tsx` | Display `<h1>`: `text-3xl` → `text-4xl` |
| `src/components/TodoListView.tsx` | List icon: `text-2xl` → `text-3xl` (scale with header) |

