

# Markdown Editor with Slash Commands & Keyboard Shortcuts

## What Changes

Upgrade the existing TipTap editor with three major capabilities:

1. **Slash command menu** -- typing `/` opens a filterable popup with block types (headings, lists, code, quote, divider, image)
2. **Markdown input rules** -- typing markdown shortcuts like `#`, `-`, `1.`, `>`, ``` at the start of a line auto-converts to the correct block (TipTap StarterKit already handles most of these, but we'll verify all are active)
3. **Keyboard shortcuts** -- Ctrl/Cmd+B (bold), Ctrl/Cmd+I (italic), Ctrl/Cmd+\` (inline code), Ctrl/Cmd+K (link insertion dialog)

No database changes needed -- content is already stored as HTML from TipTap (which preserves markdown structure).

---

## Technical Approach

### 1. Slash Command Extension (new file: `src/components/editor/SlashCommandMenu.tsx`)

Build a custom TipTap extension using `@tiptap/suggestion` (already bundled with TipTap v3). This avoids adding any new npm dependencies.

- Create a `SlashCommand` extension that listens for `/` typed at the start of a line or after whitespace
- Render a floating popup (positioned via TipTap's suggestion utilities) with categorized command items
- Support keyboard navigation (arrow keys, Enter to select, Escape to close)
- Real-time filtering as the user types after `/`
- On selection: delete the `/` trigger text, apply the corresponding editor command

**Menu categories and items:**
- Basic: Text, Heading 1, Heading 2, Heading 3
- Formatting: Code Block, Quote, Divider
- Lists: Bullet List, Numbered List, Checklist
- Media: Image (inserts `![alt](url)` placeholder)

Each item has: title, description, icon (from lucide-react), search terms, and a command function.

### 2. Slash Command Extension Logic (new file: `src/components/editor/slash-command.ts`)

A TipTap `Extension.create()` that:
- Uses the `suggestion` utility from `@tiptap/suggestion`
- Configures the `/` trigger character
- Filters items based on typed query
- Delegates rendering to the React component above
- Does NOT trigger inside code blocks

### 3. Link Insertion Dialog (enhancement in `PageEditor.tsx`)

- Ctrl/Cmd+K opens a small popover/dialog to enter a URL
- Applies the link to selected text, or inserts a new link

### 4. Updated PageEditor

- Add the `SlashCommand` extension to the editor's extensions array
- Add Ctrl/Cmd+\` shortcut for inline code toggle
- Wire up link dialog for Ctrl/Cmd+K
- Remove the empty slash command useEffect placeholder (lines 94-104)

### 5. CSS additions

- Styles for the slash command popup (positioned absolutely, with hover/selected states, grouped layout)

---

## Files Created / Modified

| File | Action |
|------|--------|
| `src/components/editor/slash-command.ts` | Create -- TipTap extension using suggestion API |
| `src/components/editor/SlashCommandMenu.tsx` | Create -- React popup component for the menu |
| `src/components/PageEditor.tsx` | Modify -- integrate slash extension, add link dialog, add keyboard shortcuts |
| `src/index.css` | Modify -- add slash menu styles |

No new npm packages needed. `@tiptap/suggestion` ships with TipTap v3 core.

