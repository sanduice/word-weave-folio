
## Implementation steps
1. Harden dropdown rendering for toolbar use-cases.
2. Remove trigger event handling that can interfere with anchor calculations.
3. Keep editor focus behavior via close handlers instead of trigger `onMouseDown` prevention.
4. Re-test sticky toolbar and inline bubble toolbar dropdown positioning in the same session.

## File-level changes
- `src/components/ui/dropdown-menu.tsx`
  - Extend `DropdownMenuContent` with a `portalled?: boolean` prop (default `true`).
  - Render `DropdownMenuPrimitive.Content` directly when `portalled={false}`, otherwise keep current portal behavior.
- `src/components/editor/StickyToolbar.tsx`
  - In `TextStyleDropdown`, remove `onMouseDown={(e) => e.preventDefault()}` from the trigger button.
  - Use `DropdownMenuContent` with explicit placement (`side="bottom"`, `align="start"`, `sideOffset={6}`) and `portalled={false}`.
  - Add `onCloseAutoFocus={(e) => { e.preventDefault(); editor.chain().focus().run(); }}` on the dropdown content.
- `src/components/editor/BubbleMenuToolbar.tsx`
  - Apply the same trigger/focus pattern for dropdown triggers (`TextStyleDropdown`, `ListDropdown`, `MoreMenu`) to prevent the same offset issue from appearing there.
  - Keep placement explicit (`side`, `align`, `sideOffset`) for consistency.

## Technical details
- No backend/database/auth changes required.
- This is a UI positioning fix focused on Radix dropdown trigger anchoring stability.
- The change avoids global portal/position side-effects by allowing local non-portalled rendering specifically where anchor drift is reported.

## Validation checklist
1. Open a page and click sticky toolbar **Text** dropdown repeatedly; confirm it opens adjacent to the trigger every time.
2. Scroll editor content, then reopen **Text** dropdown; confirm no jump to top-left.
3. Select text to show bubble toolbar; open bubble dropdowns and verify correct anchoring.
4. Confirm color/highlight popovers still open in correct positions and formatting actions still apply to current selection/cursor.
