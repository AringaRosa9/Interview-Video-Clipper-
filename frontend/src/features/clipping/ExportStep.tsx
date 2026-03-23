type ExportStepProps = {
  jobId: number;
  outputFile: string;
};

export function ExportStep(props: ExportStepProps) {
  return (
    <section>
      <h2>导出结果</h2>
      <p>成片已经导出完成，可以直接下载本地文件。</p>
      <p>输出文件：{props.outputFile}</p>
      <a href={`/api/jobs/${props.jobId}/download`} download>
        下载成片
      </a>
    </section>
  );
}
