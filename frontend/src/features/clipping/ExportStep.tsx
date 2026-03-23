type ExportStepProps = {
  jobId: number;
  outputFile: string;
};

export function ExportStep(props: ExportStepProps) {
  return (
    <div className="export-success">
      <div className="export-success-icon">🎉</div>
      <div className="export-success-title">成片已导出完成！</div>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
        精彩视频片段已成功剪辑导出，可直接下载到本地。
      </p>
      <div className="export-success-file">{props.outputFile}</div>
      <a
        href={`/api/jobs/${props.jobId}/download`}
        download
        className="btn btn-primary"
        style={{ marginTop: "8px" }}
      >
        ⬇️ 下载成片
      </a>
    </div>
  );
}
