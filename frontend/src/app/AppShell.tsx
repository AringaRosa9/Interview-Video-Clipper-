import { NavLink, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">✂️</div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">精彩 Clipper</span>
            <span className="sidebar-logo-sub">AI Video Studio</span>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="主导航">
          <NavLink
            to="/clipping"
            className={({ isActive }) => `sidebar-nav-link${isActive ? " active" : ""}`}
          >
            <span className="sidebar-nav-icon">🎬</span>
            <span>视频剪辑</span>
          </NavLink>
          <NavLink
            to="/profiles"
            className={({ isActive }) => `sidebar-nav-link${isActive ? " active" : ""}`}
          >
            <span className="sidebar-nav-icon">🔑</span>
            <span>API Key 管理</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-version-dot" />
          系统运行中
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
