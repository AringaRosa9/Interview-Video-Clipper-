import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";

function ClippingPage() {
  return <h1>视频剪辑</h1>;
}

function ProfilesPage() {
  return <h1>API Key 管理</h1>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate replace to="/clipping" />} />
        <Route path="/clipping" element={<ClippingPage />} />
        <Route path="/profiles" element={<ProfilesPage />} />
      </Route>
    </Routes>
  );
}
