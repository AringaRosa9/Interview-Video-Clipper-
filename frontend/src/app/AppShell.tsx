import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";

export function AppShell() {
  return (
    <div>
      <aside>
        <Sidebar />
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
