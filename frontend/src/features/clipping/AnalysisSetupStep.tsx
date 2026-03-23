import { FormEvent, useEffect, useState } from "react";
import type { Profile } from "../../lib/types";

type AnalysisSetupStepProps = {
  profiles: Profile[];
  initialProfileId: number | null;
  initialTargetDurationSeconds: number;
  initialCandidateSpeakerPriority: boolean;
  initialTokenSavingMode: boolean;
  submitting: boolean;
  submitError: string;
  onBack: () => void;
  onSubmit: (payload: {
    profileId: number;
    targetDurationSeconds: number;
    candidateSpeakerPriority: boolean;
    tokenSavingMode: boolean;
  }) => void;
};

function ToggleRow({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="toggle-group">
      <div className="toggle-switch-label">
        <div className="toggle-switch-title">{title}</div>
        <div className="toggle-switch-desc">{description}</div>
      </div>
      <div className="toggle-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="toggle-track" />
        <div className="toggle-thumb" />
      </div>
    </label>
  );
}

export function AnalysisSetupStep(props: AnalysisSetupStepProps) {
  const [profileId, setProfileId] = useState(
    props.initialProfileId ?? props.profiles[0]?.id ?? 0,
  );
  const [targetDurationSeconds, setTargetDurationSeconds] = useState(
    props.initialTargetDurationSeconds,
  );
  const [candidateSpeakerPriority, setCandidateSpeakerPriority] = useState(
    props.initialCandidateSpeakerPriority,
  );
  const [tokenSavingMode, setTokenSavingMode] = useState(props.initialTokenSavingMode);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profileId === 0 && props.profiles.length > 0) {
      setProfileId(props.profiles[0].id);
    }
  }, [profileId, props.profiles]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileId) {
      setError("请选择模型配置");
      return;
    }
    if (targetDurationSeconds < 30 || targetDurationSeconds > 45) {
      setError("目标时长需在 30 到 45 秒之间");
      return;
    }
    setError("");
    props.onSubmit({
      profileId,
      targetDurationSeconds,
      candidateSpeakerPriority,
      tokenSavingMode,
    });
  }

  const noProfiles = props.profiles.length === 0;

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <div className="card-title">
          <span className="card-title-icon">⚙️</span>
          分析设置
        </div>

        <div className="form-group">
          <label className="form-label">模型配置</label>
          <select
            className="form-select"
            value={profileId}
            onChange={(event) => setProfileId(Number(event.target.value))}
            disabled={noProfiles}
          >
            {noProfiles ? (
              <option value={0}>暂无可用配置</option>
            ) : null}
            {props.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} / {profile.model}
              </option>
            ))}
          </select>
          {noProfiles && (
            <div className="alert alert-info" style={{ marginTop: "8px", marginBottom: 0 }}>
              <span className="alert-icon">💡</span>
              请先到「API Key 管理」中创建模型配置。
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">目标时长（秒）</label>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input
              className="form-input"
              type="number"
              min={30}
              max={45}
              value={targetDurationSeconds}
              onChange={(event) => setTargetDurationSeconds(Number(event.target.value))}
              style={{ width: "100px" }}
            />
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>范围：30 – 45 秒</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ marginBottom: "8px" }}>智能选项</label>
          <ToggleRow
            checked={candidateSpeakerPriority}
            onChange={setCandidateSpeakerPriority}
            title="候选人发言优先"
            description="优先选取候选人发言的片段"
          />
          <ToggleRow
            checked={tokenSavingMode}
            onChange={setTokenSavingMode}
            title="节省 Token 模式"
            description="减少 LLM 调用次数，降低费用"
          />
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
        )}
        {props.submitError && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {props.submitError}
          </div>
        )}

        <div className="btn-group" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn btn-secondary" onClick={props.onBack}>
            ← 返回上一步
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={props.submitting || noProfiles}
          >
            {props.submitting ? (
              <>
                <span className="spinner" />
                正在创建任务...
              </>
            ) : (
              <>✨ 开始 AI 剪辑</>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
