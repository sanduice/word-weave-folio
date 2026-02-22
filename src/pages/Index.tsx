import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { PageEditor } from "@/components/PageEditor";
import { SearchDialog } from "@/components/SearchDialog";

const Index = () => {
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <PageEditor />
        </div>
      </div>
      <SearchDialog />
    </SidebarProvider>
  );
};

export default Index;
