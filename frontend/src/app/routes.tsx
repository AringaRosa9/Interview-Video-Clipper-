import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AnalysisSetupStep } from "../features/clipping/AnalysisSetupStep";
import { VideoLinkStep } from "../features/clipping/VideoLinkStep";
import { useClippingWizard } from "../features/clipping/useClippingWizard";
import { ProfileForm } from "../features/profiles/ProfileForm";
import { ProfileList } from "../features/profiles/ProfileList";
import { createJob, listProfiles } from "../lib/api";
import type { Job, Profile } from "../lib/types";
import { AppShell } from "./AppShell";

function ClippingPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesError, setProfilesError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [wizardState, dispatch] = useClippingWizard();

  async function loadProfiles() {
    try {
      const nextProfiles = await listProfiles();
      setProfiles(nextProfiles);
      setProfilesError("");
    } catch {
      setProfilesError("加载模型配置失败");
    }
  }

  useEffect(() => {
    void loadProfiles();
  }, []);

  async function handleCreateJob(payload: {
    profileId: number;
    targetDurationSeconds: number;
    candidateSpeakerPriority: boolean;
    tokenSavingMode: boolean;
  }) {
    dispatch({
      type: "setupSaved",
      payload: {
        videoUrl: wizardState.videoUrl,
        candidateName: wizardState.candidateName,
        notes: wizardState.notes,
        profileId: payload.profileId,
        targetDurationSeconds: payload.targetDurationSeconds,
        candidateSpeakerPriority: payload.candidateSpeakerPriority,
        tokenSavingMode: payload.tokenSavingMode,
      },
    });
    setSubmitting(true);
    try {
      const job: Job = await createJob({
        video_url: wizardState.videoUrl,
        candidate_name: wizardState.candidateName,
        profile_id: payload.profileId,
        target_duration_seconds: payload.targetDurationSeconds,
      });
      dispatch({
        type: "jobCreated",
        payload: {
          jobId: job.id,
          jobStatus: job.status,
        },
      });
    } catch {
      dispatch({
        type: "jobFailed",
        payload: {
          message: "创建剪辑任务失败，请检查视频链接和模型配置后重试。",
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>视频剪辑</h1>
      <p>输入公开视频链接，选择模型配置后开始生成候选人亮点短片。</p>
      {profilesError ? <p>{profilesError}</p> : null}
      {wizardState.step === "video-link" ? (
        <VideoLinkStep
          initialVideoUrl={wizardState.videoUrl}
          initialCandidateName={wizardState.candidateName}
          initialNotes={wizardState.notes}
          onNext={(payload) => dispatch({ type: "videoDetailsSaved", payload })}
        />
      ) : null}
      {wizardState.step === "analysis-setup" ? (
        <AnalysisSetupStep
          profiles={profiles}
          initialProfileId={wizardState.profileId}
          initialTargetDurationSeconds={wizardState.targetDurationSeconds}
          initialCandidateSpeakerPriority={wizardState.candidateSpeakerPriority}
          initialTokenSavingMode={wizardState.tokenSavingMode}
          submitting={submitting}
          submitError={wizardState.submitError}
          onBack={() => dispatch({ type: "backToVideoLink" })}
          onSubmit={handleCreateJob}
        />
      ) : null}
      {wizardState.step === "loading" ? (
        <section>
          <h2>任务已启动</h2>
          <p>当前状态：{wizardState.jobStatus || "准备中"}</p>
          <p>任务编号：{wizardState.jobId ?? "待分配"}</p>
          <p>系统正在下载视频、抽取音频并准备转写结果。</p>
          <button type="button" onClick={() => dispatch({ type: "backToAnalysisSetup" })}>
            返回修改设置
          </button>
        </section>
      ) : null}
      {wizardState.step === "review" ? (
        <section>
          <h2>AI 推荐片段</h2>
          <p>推荐片段已准备完成。下一步将接入人工确认和导出功能。</p>
        </section>
      ) : null}
    </div>
  );
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
      {selectedProfile ? (
        <button type="button" onClick={() => setSelectedProfile(undefined)}>
          新建配置
        </button>
      ) : null}
      <ProfileForm
        onSaved={loadProfiles}
        profile={selectedProfile}
        onCancelEdit={() => setSelectedProfile(undefined)}
      />
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
