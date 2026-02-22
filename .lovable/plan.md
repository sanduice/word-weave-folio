
# Make Todo Detail Panel Resizable (Like Comment Panel)

## What Changes

The Todo detail sidebar currently has a fixed width of 400px. This will be updated to use resizable panels (same approach as the comment panel on pages), making it draggable and allowing a wider max size.

## Changes to Make

### File: `src/components/TodoListView.tsx`

1. Import `ResizablePanelGroup`, `ResizablePanel`, and `ResizableHandle` from `@/components/ui/resizable`
2. Wrap the todo list content and the `TodoDetail` in a `ResizablePanelGroup` with `direction="horizontal"`
3. The main todo list becomes a `ResizablePanel` with `defaultSize` of 100 when no todo is selected, or ~70 when one is open, and `minSize={40}`
4. The `TodoDetail` becomes a `ResizablePanel` with `defaultSize={30}`, `minSize={20}`, `maxSize={50}` -- giving it more room than the comment panel's max of 30
5. A `ResizableHandle` separator is placed between them for dragging

### File: `src/components/TodoDetail.tsx`

1. Remove the fixed `w-[400px]` class from the outer div
2. Change it to `w-full h-full` since the resizable panel now controls sizing
3. Remove `shrink-0` since the panel handles that

## Technical Notes

- The comment panel uses `defaultSize={20}`, `minSize={15}`, `maxSize={30}` (percentage-based)
- The todo detail will use `defaultSize={30}`, `minSize={20}`, `maxSize={50}` for a wider max
- Panel size can optionally be persisted to localStorage (like the comment panel does)
- The `ResizableHandle` provides the drag interaction automatically
