import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { PageEditor } from "@/components/PageEditor";
import { TodoDetail } from "@/components/TodoDetail";
import { SearchDialog } from "@/components/SearchDialog";
import { useAppStore } from "@/stores/app-store";

const Index = () => {
  const selectedTodoId = useAppStore((s) => s.selectedTodoId);

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          {selectedTodoId ? <TodoDetail /> : <PageEditor />}
        </div>
      </div>
      <SearchDialog />
    </SidebarProvider>
  );
};

export default Index;
