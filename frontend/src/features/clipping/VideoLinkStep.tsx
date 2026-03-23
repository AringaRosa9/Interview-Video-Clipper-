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
      setError("请输入以 .mp4 结尾的视频链接");
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
      <h2>视频链接</h2>
      <label>
        视频链接
        <input
          type="url"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          placeholder="https://cdn.example.com/interview.mp4"
        />
      </label>
      <label>
        候选人姓名
        <input
          type="text"
          value={candidateName}
          onChange={(event) => setCandidateName(event.target.value)}
          placeholder="例如：张三"
        />
      </label>
      <label>
        岗位/备注
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="例如：后端工程师 / 社招二面"
          rows={4}
        />
      </label>
      {error ? <p>{error}</p> : null}
      <button type="submit">下一步：分析设置</button>
    </form>
  );
}
