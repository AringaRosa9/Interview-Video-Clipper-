import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProfileForm } from "../features/profiles/ProfileForm";
import { ProfileList } from "../features/profiles/ProfileList";
import { listProfiles } from "../lib/api";
import type { Profile } from "../lib/types";
import { AppShell } from "./AppShell";

function ClippingPage() {
  return <h1>视频剪辑</h1>;
}

function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | undefined>(undefined);
  const [error, setError] = useState("");

  async function loadProfiles() {
    try {
      const nextProfiles = await listProfiles();
      setProfiles(nextProfiles);
      if (selectedProfile) {
        const updatedSelected = nextProfiles.find((profile) => profile.id === selectedProfile.id);
        setSelectedProfile(updatedSelected);
      }
      setError("");
    } catch {
      setError("加载配置失败");
    }
  }

  useEffect(() => {
    void loadProfiles();
  }, []);

  return (
    <div>
      <h1>API Key 管理</h1>
      <p>管理 OpenAI 兼容服务配置，支持中文表单、默认配置标记和连接测试。</p>
      {error ? <p>{error}</p> : null}
      <ProfileForm onSaved={loadProfiles} profile={selectedProfile} />
      <ProfileList
        profiles={profiles}
        selectedProfileId={selectedProfile?.id}
        onSelect={setSelectedProfile}
      />
    </div>
  );
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
