import { createFileRoute } from "@tanstack/react-router";
import { AppPage } from "@/components/app-page";
import { TodoView } from "@/components/todo/todo-view";
import { usePageTitle } from "@/hooks/use-page-title";
import { SITE_TITLE } from "@/lib/page-title";

export const Route = createFileRoute("/todo")({
  component: TodoPage,
});

function TodoPage() {
  usePageTitle("To-do", SITE_TITLE);
  return (
    <AppPage activePage="todo" title="To-do">
      <TodoView />
    </AppPage>
  );
}
