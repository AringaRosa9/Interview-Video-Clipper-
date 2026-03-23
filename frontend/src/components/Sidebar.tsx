import { Link } from "react-router-dom";

export function Sidebar() {
  return (
    <nav aria-label="主导航">
      <Link to="/clipping">视频剪辑</Link>
      <Link to="/profiles">API Key 管理</Link>
    </nav>
  );
}
