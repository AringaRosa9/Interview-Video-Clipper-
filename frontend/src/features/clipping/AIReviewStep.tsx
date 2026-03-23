import type { HighlightItem } from "../../lib/types";

type AIReviewStepProps = {
  items: HighlightItem[];
  selectedHighlightIds: number[];
  submitting: boolean;
  submitError: string;
  onKeep: (highlightId: number) => void;
  onRemove: (highlightId: number) => void;
  onSubmit: () => void;
};

export function AIReviewStep(props: AIReviewStepProps) {
  return (
    <section>
      <h2>AI 推荐片段</h2>
      <p>请确认推荐片段，保留需要导出的高光内容。</p>
      {props.items.map((item, index) => {
        const isSelected = props.selectedHighlightIds.includes(index);

        return (
          <article key={`${item.start}-${item.end}-${index}`}>
            <p>
              片段时间：{item.start}s - {item.end}s
            </p>
            <p>STAR 标签：{item.star_label}</p>
            <p>片段摘要：{item.summary}</p>
            <p>推荐理由：{item.reason}</p>
            <p>评分：{item.score}</p>
            <p>当前状态：{isSelected ? "已保留" : "已移除"}</p>
            <button type="button" onClick={() => props.onKeep(index)}>
              保留
            </button>
            <button type="button" onClick={() => props.onRemove(index)}>
              移除
            </button>
          </article>
        );
      })}
      {props.submitError ? <p>{props.submitError}</p> : null}
      <button
        type="button"
        onClick={props.onSubmit}
        disabled={props.submitting || props.selectedHighlightIds.length === 0}
      >
        {props.submitting ? "正在导出..." : "提交审核并导出"}
      </button>
    </section>
  );
}
