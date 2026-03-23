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

// ── Wizard Step Indicator ──────────────────────────────────────────────────

type WizardStep = {
  label: string;
  key: string;
};

const WIZARD_STEPS: WizardStep[] = [
  { key: "video-link", label: "视频链接" },
  { key: "analysis-setup", label: "分析设置" },
  { key: "loading", label: "AI 处理" },
  { key: "review", label: "审核导出" },
];

function StepIndicator({ currentStep }: { currentStep: string }) {
  const currentIndex = WIZARD_STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="wizard-steps">
      {WIZARD_STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isActive = i === currentIndex;

        return (
          <div key={step.key} className={`wizard-step${isCompleted ? " completed" : isActive ? " active" : ""}`}>
            <div className="wizard-step-inner">
              <div className="wizard-step-num">
                {isCompleted ? "✓" : i + 1}
              </div>
              <span className="wizard-step-label">{step.label}</span>
            </div>
            {i < WIZARD_STEPS.length - 1 && <div className="wizard-step-line" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Clipping Page ──────────────────────────────────────────────────────────

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

  useEffect(() => { void loadProfiles(); }, []);

  // Poll job status while loading
  useEffect(() => {
    if (wizardState.step !== "loading" || wizardState.jobId === null) return undefined;

    let cancelled = false;
    let nextPoll: number | undefined;

    async function pollJobStatus() {
      try {
        const job = await getJob(wizardState.jobId as number);
        if (cancelled) return;
        dispatch({ type: "jobStatusUpdated", payload: { jobStatus: job.status } });
        if (!REVIEWABLE_JOB_STATUSES.has(job.status)) {
          nextPoll = window.setTimeout(() => { void pollJobStatus(); }, 2000);
        }
      } catch {
        if (!cancelled) nextPoll = window.setTimeout(() => { void pollJobStatus(); }, 2000);
      }
    }

    void pollJobStatus();
    return () => {
      cancelled = true;
      if (nextPoll !== undefined) window.clearTimeout(nextPoll);
    };
  }, [dispatch, wizardState.jobId, wizardState.step]);

  // Load highlights when entering review step
  useEffect(() => {
    if (wizardState.step !== "review" || wizardState.jobId === null) return;
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
      dispatch({ type: "jobCreated", payload: { jobId: job.id, jobStatus: job.status } });
    } catch {
      dispatch({ type: "jobFailed", payload: { message: "创建剪辑任务失败，请检查视频链接和模型配置后重试。" } });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReviewSubmit() {
    if (wizardState.jobId === null) return;
    setReviewSubmitting(true);
    try {
      await reviewJob(wizardState.jobId, { approved_highlight_ids: selectedHighlightIds });
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
      current.includes(highlightId) ? current : [...current, highlightId].sort((l, r) => l - r),
    );
  }

  function handleRemove(highlightId: number) {
    setSelectedHighlightIds((current) => current.filter((item) => item !== highlightId));
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-eyebrow">AI 驱动</div>
        <h1 className="page-title">视频剪辑</h1>
        <p className="page-subtitle">输入公开视频链接，选择模型配置后开始生成候选人亮点短片。</p>
      </div>

      {profilesError && (
        <div className="alert alert-error" style={{ marginBottom: "24px" }}>
          <span className="alert-icon">⚠️</span>
          {profilesError}
        </div>
      )}

      <StepIndicator currentStep={wizardState.step} />

      {wizardState.step === "video-link" && (
        <VideoLinkStep
          initialVideoUrl={wizardState.videoUrl}
          initialCandidateName={wizardState.candidateName}
          initialNotes={wizardState.notes}
          onNext={(payload) => dispatch({ type: "videoDetailsSaved", payload })}
        />
      )}

      {wizardState.step === "analysis-setup" && (
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
      )}

      {wizardState.step === "loading" && (
        <div className="card">
          <div className="loading-state">
            <div className="spinner spinner-lg" />
            <div className="loading-state-title">AI 正在分析视频</div>
            <div className="loading-pulse">
              <div className="loading-pulse-dot" />
              <div className="loading-pulse-dot" />
              <div className="loading-pulse-dot" />
            </div>
            <div className="loading-state-desc">
              系统正在下载视频、抽取音频并准备转写结果，请耐心等待。
            </div>

            <div className="info-grid" style={{ width: "100%", maxWidth: "480px" }}>
              <div className="info-item">
                <div className="info-item-label">任务编号</div>
                <div className="info-item-value">{wizardState.jobId ?? "待分配"}</div>
              </div>
              <div className="info-item">
                <div className="info-item-label">当前状态</div>
                <div className="info-item-value">
                  <span className="status-tag status-tag-cyan" style={{ fontSize: "11px" }}>
                    {wizardState.jobStatus || "准备中"}
                  </span>
                </div>
              </div>
              {wizardState.candidateSpeakerPriority && (
                <div className="info-item">
                  <div className="info-item-label">优化选项</div>
                  <div className="info-item-value">候选人发言优先</div>
                </div>
              )}
              {wizardState.tokenSavingMode && (
                <div className="info-item">
                  <div className="info-item-label">Token 模式</div>
                  <div className="info-item-value">节省模式</div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => dispatch({ type: "backToAnalysisSetup" })}
            >
              ← 返回修改设置
            </button>
          </div>
        </div>
      )}

      {wizardState.step === "review" && (
        <div>
          {/* Config summary tags */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
            {wizardState.notes && (
              <span className="status-tag status-tag-purple">📋 {wizardState.notes}</span>
            )}
            <span className={`status-tag ${wizardState.candidateSpeakerPriority ? "status-tag-green" : "status-tag-cyan"}`}>
              {wizardState.candidateSpeakerPriority ? "✓ 候选人发言优先" : "○ 无发言优先"}
            </span>
            <span className={`status-tag ${wizardState.tokenSavingMode ? "status-tag-yellow" : "status-tag-cyan"}`}>
              {wizardState.tokenSavingMode ? "🪙 节省 Token" : "💡 标准模式"}
            </span>
          </div>

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
        </div>
      )}
    </div>
  );
}

// ── Profiles Page ──────────────────────────────────────────────────────────

function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | undefined>(undefined);
  const [error, setError] = useState("");

  async function loadProfiles() {
    try {
      const nextProfiles = await listProfiles();
      setProfiles(nextProfiles);
      if (selectedProfile) {
        const updatedSelected = nextProfiles.find((p) => p.id === selectedProfile.id);
        setSelectedProfile(updatedSelected);
      }
      setError("");
    } catch {
      setError("加载配置失败");
    }
  }

  useEffect(() => { void loadProfiles(); }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-eyebrow">配置管理</div>
        <h1 className="page-title">API Key 管理</h1>
        <p className="page-subtitle">管理 OpenAI 兼容服务配置，支持连接测试和默认配置标记。</p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "24px" }}>
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="two-col">
        <div>
          {selectedProfile && (
            <div style={{ marginBottom: "12px" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedProfile(undefined)}
              >
                ➕ 新建配置
              </button>
            </div>
          )}
          <ProfileForm
            onSaved={loadProfiles}
            profile={selectedProfile}
            onCancelEdit={() => setSelectedProfile(undefined)}
          />
        </div>
        <div>
          <ProfileList
            profiles={profiles}
            selectedProfileId={selectedProfile?.id}
            onSelect={setSelectedProfile}
          />
        </div>
      </div>
    </div>
  );
}

// ── Router ─────────────────────────────────────────────────────────────────

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
