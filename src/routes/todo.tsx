import { createFileRoute } from "@tanstack/react-router";
import { AppPage } from "@/components/app-page";
import { TodoView } from "@/components/todo/todo-view";

export const Route = createFileRoute("/todo")({
  component: TodoPage,
});

function TodoPage() {
  return (
    <AppPage activePage="todo" title="To-do">
      <TodoView />
    </AppPage>
  );
}
