import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { CalendarView } from "@/components/calendar/calendar-view";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useCanvasSessionRestore } from "@/integrations/canvas/use-session";
import { useTRPCClient } from "@/integrations/trpc/react";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const navigate = useNavigate();
  const client = useTRPCClient();
  const dashboard = useCanvasStore((state) => state.dashboard);

  useCanvasSessionRestore();

  async function disconnect() {
    useCanvasStore.getState().forgetSession();
    try {
      await client.canvas.disconnect.mutate();
    } finally {
      await navigate({ to: "/" });
    }
  }

  return (
    <SidebarProvider>
      {dashboard ? (
        <AppSidebar
          data={dashboard}
          activePage="calendar"
          onDisconnect={() => void disconnect()}
        />
      ) : null}

      <SidebarInset>
        <header className="flex min-h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ms-1" />
          <Separator orientation="vertical" className="me-1 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link to="/" />}>
                  Overview
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Calendar</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ms-auto">
            <ModeToggle />
          </div>
        </header>

        <main className="flex w-full min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 md:px-10">
          <CalendarView />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
