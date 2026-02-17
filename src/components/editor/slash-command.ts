import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface SlashCommandItem {
  title: string;
  description: string;
  searchTerms: string[];
  category: string;
  icon: string;
  command: (editor: any) => void;
}

export const slashCommandPluginKey = new PluginKey("slashCommand");

export interface SlashCommandState {
  active: boolean;
  query: string;
  range: { from: number; to: number } | null;
  decorationSet: DecorationSet;
}

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: slashCommandPluginKey,
        state: {
          init(): SlashCommandState {
            return { active: false, query: "", range: null, decorationSet: DecorationSet.empty };
          },
          apply(tr, prev, _oldState, newState): SlashCommandState {
            const meta = tr.getMeta(slashCommandPluginKey);
            if (meta) return meta;

            // If not active, check if we should activate
            if (!prev.active) {
              if (!tr.docChanged) return prev;
              const { $from } = newState.selection;
              const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

              // Check if inside code block
              if ($from.parent.type.name === "codeBlock") return prev;

              const match = textBefore.match(/(?:^|\s)\/([\w]*)$/);
              if (match) {
                const from = $from.pos - match[1].length - 1;
                const to = $from.pos;
                return { active: true, query: match[1], range: { from, to }, decorationSet: DecorationSet.empty };
              }
              return prev;
            }

            // Already active — update or deactivate
            const { $from } = newState.selection;
            if ($from.parent.type.name === "codeBlock") {
              return { active: false, query: "", range: null, decorationSet: DecorationSet.empty };
            }
            const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
            const match = textBefore.match(/(?:^|\s)\/([\w]*)$/);
            if (match) {
              const from = $from.pos - match[1].length - 1;
              const to = $from.pos;
              return { active: true, query: match[1], range: { from, to }, decorationSet: DecorationSet.empty };
            }
            return { active: false, query: "", range: null, decorationSet: DecorationSet.empty };
          },
        },
        props: {
          handleKeyDown(view, event) {
            const state = slashCommandPluginKey.getState(view.state) as SlashCommandState;
            if (!state?.active) return false;

            if (event.key === "Escape") {
              view.dispatch(
                view.state.tr.setMeta(slashCommandPluginKey, {
                  active: false, query: "", range: null, decorationSet: DecorationSet.empty,
                })
              );
              return true;
            }

            if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Enter") {
              // Handled by the React component via custom events
              const customEvent = new CustomEvent("slash-command-key", { detail: { key: event.key } });
              window.dispatchEvent(customEvent);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
