import { FormEvent, useState } from "react";
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

  return (
    <form onSubmit={handleSubmit}>
      <h2>分析设置</h2>
      <label>
        模型配置
        <select
          value={profileId}
          onChange={(event) => setProfileId(Number(event.target.value))}
          disabled={props.profiles.length === 0}
        >
          {props.profiles.length === 0 ? <option value={0}>暂无可用配置</option> : null}
          {props.profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} / {profile.model}
            </option>
          ))}
        </select>
      </label>
      <label>
        目标时长
        <input
          type="number"
          min={30}
          max={45}
          value={targetDurationSeconds}
          onChange={(event) => setTargetDurationSeconds(Number(event.target.value))}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={candidateSpeakerPriority}
          onChange={(event) => setCandidateSpeakerPriority(event.target.checked)}
        />
        候选人发言优先
      </label>
      <label>
        <input
          type="checkbox"
          checked={tokenSavingMode}
          onChange={(event) => setTokenSavingMode(event.target.checked)}
        />
        节省 Token 模式
      </label>
      {props.profiles.length === 0 ? <p>请先到 API Key 管理 中创建模型配置。</p> : null}
      {error ? <p>{error}</p> : null}
      {props.submitError ? <p>{props.submitError}</p> : null}
      <button type="button" onClick={props.onBack}>
        返回上一步
      </button>
      <button type="submit" disabled={props.submitting || props.profiles.length === 0}>
        {props.submitting ? "正在创建任务..." : "开始 AI 剪辑"}
      </button>
    </form>
  );
}
