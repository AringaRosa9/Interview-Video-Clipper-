import { FormEvent, useState } from "react";

type VideoLinkStepProps = {
  initialVideoUrl: string;
  initialCandidateName: string;
  initialNotes: string;
  onNext: (payload: {
    videoUrl: string;
    candidateName: string;
    notes: string;
  }) => void;
};

function isValidMp4Url(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.pathname.toLowerCase().endsWith(".mp4");
  } catch {
    return false;
  }
}

export function VideoLinkStep(props: VideoLinkStepProps) {
  const [videoUrl, setVideoUrl] = useState(props.initialVideoUrl);
  const [candidateName, setCandidateName] = useState(props.initialCandidateName);
  const [notes, setNotes] = useState(props.initialNotes);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedVideoUrl = videoUrl.trim();
    if (!isValidMp4Url(trimmedVideoUrl)) {
      setError("请输入以 .mp4 结尾的有效视频链接");
      return;
    }
    setError("");
    props.onNext({
      videoUrl: trimmedVideoUrl,
      candidateName: candidateName.trim(),
      notes: notes.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <div className="card-title">
          <span className="card-title-icon">🔗</span>
          视频信息
        </div>

        <div className="form-group">
          <label className="form-label">视频链接</label>
          <div className="form-input-wrapper">
            <span className="form-input-icon">📹</span>
            <input
              className="form-input"
              type="url"
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              placeholder="https://cdn.example.com/interview.mp4"
            />
          </div>
          <span className="form-hint">仅支持以 .mp4 结尾的公开视频链接</span>
        </div>

        <div className="form-group">
          <label className="form-label">候选人姓名</label>
          <div className="form-input-wrapper">
            <span className="form-input-icon">👤</span>
            <input
              className="form-input"
              type="text"
              value={candidateName}
              onChange={(event) => setCandidateName(event.target.value)}
              placeholder="例如：张三"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">岗位 / 备注</label>
          <textarea
            className="form-textarea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="例如：后端工程师 / 社招二面"
            rows={3}
          />
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="btn-group" style={{ justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-primary">
            <span>下一步：分析设置</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </form>
  );
}
