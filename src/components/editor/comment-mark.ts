import { Mark, mergeAttributes } from "@tiptap/core";

export const CommentHighlight = Mark.create({
  name: "commentHighlight",

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-comment-id"),
        renderHTML: (attrs) => {
          if (!attrs.commentId) return {};
          return { "data-comment-id": attrs.commentId };
        },
      },
      status: {
        default: "open",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-comment-status") || "open",
        renderHTML: (attrs) => {
          return { "data-comment-status": attrs.status || "open" };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "comment-highlight",
      }),
      0,
    ];
  },

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
});
