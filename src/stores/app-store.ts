import { create } from "zustand";

interface AppState {
  selectedSpaceId: string | null;
  selectedPageId: string | null;
  setSelectedSpaceId: (id: string | null) => void;
  setSelectedPageId: (id: string | null) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  commentPanelOpen: boolean;
  setCommentPanelOpen: (open: boolean) => void;
  activeCommentId: string | null;
  setActiveCommentId: (id: string | null) => void;
  selectedTodoId: string | null;
  setSelectedTodoId: (id: string | null) => void;
  todoFilter: "todo" | "done";
  setTodoFilter: (filter: "todo" | "done") => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedSpaceId: null,
  selectedPageId: null,
  setSelectedSpaceId: (id) => set({ selectedSpaceId: id, selectedPageId: null, selectedTodoId: null }),
  setSelectedPageId: (id) => set({ selectedPageId: id, selectedTodoId: null }),
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
  commentPanelOpen: false,
  setCommentPanelOpen: (open) => set({ commentPanelOpen: open }),
  activeCommentId: null,
  setActiveCommentId: (id) => set({ activeCommentId: id }),
  selectedTodoId: null,
  setSelectedTodoId: (id) => set({ selectedTodoId: id, selectedPageId: null }),
  todoFilter: "todo" as const,
  setTodoFilter: (filter) => set({ todoFilter: filter }),
}));
