import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AIReviewStep } from "../features/clipping/AIReviewStep";
import { AnalysisSetupStep } from "../features/clipping/AnalysisSetupStep";
import { ExportStep } from "../features/clipping/ExportStep";
import { VideoLinkStep } from "../features/clipping/VideoLinkStep";
import { useClippingWizard } from "../features/clipping/useClippingWizard";
import { ProfileForm } from "../features/profiles/ProfileForm";
import { ProfileList } from "../features/profiles/ProfileList";
import { createJob, exportJob, getJob, getJobHighlights, listProfiles, reviewJob } from "../lib/api";
import type { HighlightItem, Job, JobExportResult, Profile } from "../lib/types";
import { AppShell } from "./AppShell";

const REVIEWABLE_JOB_STATUSES = new Set(["review_ready", "reviewed", "exported"]);

function ClippingPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesError, setProfilesError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [selectedHighlightIds, setSelectedHighlightIds] = useState<number[]>([]);
  const [exportResult, setExportResult] = useState<JobExportResult | null>(null);
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

  useEffect(() => {
    if (wizardState.step !== "loading" || wizardState.jobId === null) {
      return undefined;
    }

    let cancelled = false;
    let nextPoll: number | undefined;

    async function pollJobStatus() {
      try {
        const job = await getJob(wizardState.jobId as number);
        if (cancelled) {
          return;
        }
        dispatch({
          type: "jobStatusUpdated",
          payload: {
            jobStatus: job.status,
          },
        });
        if (!REVIEWABLE_JOB_STATUSES.has(job.status)) {
          nextPoll = window.setTimeout(() => {
            void pollJobStatus();
          }, 2000);
        }
      } catch {
        if (!cancelled) {
          nextPoll = window.setTimeout(() => {
            void pollJobStatus();
          }, 2000);
        }
      }
    }

    void pollJobStatus();

    return () => {
      cancelled = true;
      if (nextPoll !== undefined) {
        window.clearTimeout(nextPoll);
      }
    };
  }, [dispatch, wizardState.jobId, wizardState.step]);

  useEffect(() => {
    if (wizardState.step !== "review" || wizardState.jobId === null) {
      return;
    }

    async function loadHighlights() {
      try {
        const response = await getJobHighlights(wizardState.jobId as number);
        setHighlights(response.items);
        setSelectedHighlightIds([]);
        setReviewError("");
      } catch {
        setReviewError("加载推荐片段失败，请稍后重试。");
      }
    }

    void loadHighlights();
  }, [wizardState.jobId, wizardState.step]);

  async function handleCreateJob(payload: {
    profileId: number;
    targetDurationSeconds: number;
    candidateSpeakerPriority: boolean;
    tokenSavingMode: boolean;
  }) {
    setHighlights([]);
    setSelectedHighlightIds([]);
    setExportResult(null);
    setReviewError("");
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

  async function handleReviewSubmit() {
    if (wizardState.jobId === null) {
      return;
    }

    setReviewSubmitting(true);
    try {
      await reviewJob(wizardState.jobId, {
        approved_highlight_ids: selectedHighlightIds,
      });
      const exported = await exportJob(wizardState.jobId);
      setExportResult(exported);
      setReviewError("");
    } catch {
      setReviewError("提交审核或导出失败，请稍后重试。");
    } finally {
      setReviewSubmitting(false);
    }
  }

  function handleKeep(highlightId: number) {
    setSelectedHighlightIds((current) =>
      current.includes(highlightId) ? current : [...current, highlightId].sort((left, right) => left - right),
    );
  }

  function handleRemove(highlightId: number) {
    setSelectedHighlightIds((current) => current.filter((item) => item !== highlightId));
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
          <p>候选人发言优先：{wizardState.candidateSpeakerPriority ? "已开启" : "未开启"}</p>
          <p>节省 Token 模式：{wizardState.tokenSavingMode ? "已开启" : "未开启"}</p>
          {wizardState.notes ? <p>岗位/备注：{wizardState.notes}</p> : null}
          <p>系统正在下载视频、抽取音频并准备转写结果。</p>
          <button type="button" onClick={() => dispatch({ type: "backToAnalysisSetup" })}>
            返回修改设置
          </button>
        </section>
      ) : null}
      {wizardState.step === "review" ? (
        <section>
          <p>候选人发言优先：{wizardState.candidateSpeakerPriority ? "已开启" : "未开启"}</p>
          <p>节省 Token 模式：{wizardState.tokenSavingMode ? "已开启" : "未开启"}</p>
          {wizardState.notes ? <p>岗位/备注：{wizardState.notes}</p> : null}
          {exportResult ? (
            <ExportStep jobId={exportResult.job_id} outputFile={exportResult.output_file} />
          ) : (
            <AIReviewStep
              items={highlights}
              selectedHighlightIds={selectedHighlightIds}
              submitting={reviewSubmitting}
              submitError={reviewError}
              onKeep={handleKeep}
              onRemove={handleRemove}
              onSubmit={handleReviewSubmit}
            />
          )}
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
