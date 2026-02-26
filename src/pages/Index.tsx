import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { PageEditor } from "@/components/PageEditor";
import { TodoListView } from "@/components/TodoListView";
import { SearchDialog } from "@/components/SearchDialog";
import { HomePage } from "@/pages/HomePage";
import { useAppStore } from "@/stores/app-store";

const Index = () => {
  const viewMode = useAppStore((s) => s.viewMode);
  const selectedPageId = useAppStore((s) => s.selectedPageId);
  const selectedTodoListId = useAppStore((s) => s.selectedTodoListId);

  const showHome = !selectedPageId && !selectedTodoListId;

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          {showHome ? <HomePage /> : viewMode === "todos" ? <TodoListView /> : <PageEditor />}
        </div>
      </div>
      <SearchDialog />
    </SidebarProvider>
  );
};

export default Index;
