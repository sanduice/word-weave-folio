import { useRecentPages } from "@/hooks/use-pages";
import { useCreatePage } from "@/hooks/use-pages";
import { useCreateTodoList } from "@/hooks/use-todo-lists";
import { useUpcomingTodos } from "@/hooks/use-todos";
import { useSession, useProfile } from "@/hooks/use-auth";
import { useAppStore } from "@/stores/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ListTodo, Search, Plus, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const priorityColors: Record<string, string> = {
  high: "bg-destructive/15 text-destructive",
  medium: "bg-orange-500/15 text-orange-600",
  low: "bg-primary/15 text-primary",
};

export function HomePage() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: recentPages } = useRecentPages();
  const { data: upcomingTodos } = useUpcomingTodos();
  const createPage = useCreatePage();
  const createTodoList = useCreateTodoList();
  const {
    selectedSpaceId,
    setSelectedSpaceId,
    setSelectedPageId,
    setSelectedTodoListId,
    setSelectedTodoId,
    setSearchOpen,
  } = useAppStore();

  const displayName = profile?.full_name?.split(" ")[0] ?? "";
  const greeting = getGreeting();

  function handleNewPage() {
    if (!selectedSpaceId) return;
    createPage.mutate(
      { space_id: selectedSpaceId, title: "" },
      { onSuccess: (p) => setSelectedPageId(p.id) }
    );
  }

  function handleNewTodoList() {
    if (!selectedSpaceId) return;
    createTodoList.mutate(
      { space_id: selectedSpaceId },
      { onSuccess: (tl) => setSelectedTodoListId(tl.id) }
    );
  }

  function handleOpenPage(spaceId: string, pageId: string) {
    setSelectedSpaceId(spaceId);
    setSelectedPageId(pageId);
  }

  function handleOpenTodo(todoListId: string, todoId: string) {
    setSelectedTodoListId(todoListId);
    setSelectedTodoId(todoId);
  }

  const recentItems = (recentPages ?? [])
    .filter((r) => r.pages)
    .slice(0, 8);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}{displayName ? `, ${displayName}` : ""} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Pick up where you left off</p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" className="gap-2" onClick={handleNewPage} disabled={!selectedSpaceId}>
            <Plus className="h-4 w-4" /> New Page
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleNewTodoList} disabled={!selectedSpaceId}>
            <ListTodo className="h-4 w-4" /> New Todo List
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setSearchOpen(true)}>
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>

        {/* Recently Visited */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Recently Visited
          </h2>
          {recentItems.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent pages yet</p>
                <Button variant="link" size="sm" className="mt-1" onClick={handleNewPage} disabled={!selectedSpaceId}>
                  Create a page
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recentItems.map((r) => {
                const page = r.pages as any;
                const space = page?.spaces as any;
                const title = page?.title?.trim() || "Untitled";
                return (
                  <button
                    key={r.id}
                    onClick={() => handleOpenPage(page.space_id, page.id)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left group"
                  >
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        {space?.icon && <span>{space.icon}</span>}
                        {space?.name ?? ""}
                        <span className="mx-1">·</span>
                        <Clock className="h-3 w-3 inline" />
                        {formatDistanceToNow(new Date(r.opened_at), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Upcoming Todos */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Upcoming Todos
          </h2>
          {(!upcomingTodos || upcomingTodos.length === 0) ? (
            <Card>
              <CardContent className="py-8 text-center">
                <ListTodo className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1">
              {upcomingTodos.map((todo) => (
                <button
                  key={todo.id}
                  onClick={() => todo.todo_list_id && handleOpenTodo(todo.todo_list_id, todo.id)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left"
                >
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate flex-1 text-foreground">
                    {todo.title?.trim() || "Untitled"}
                  </span>
                  {todo.priority !== "none" && (
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${priorityColors[todo.priority] ?? "bg-muted text-muted-foreground"}`}>
                      {todo.priority}
                    </span>
                  )}
                  {todo.due_date && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(todo.due_date), "MMM d")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
