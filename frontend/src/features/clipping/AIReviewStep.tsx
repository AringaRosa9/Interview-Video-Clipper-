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
  const total = props.items.length;
  const kept = props.selectedHighlightIds.length;

  return (
    <section>
      <div className="section-header">
        <div className="section-title">🤖 AI 推荐片段</div>
        {total > 0 && (
          <span className="status-tag status-tag-cyan">
            已选 {kept} / {total}
          </span>
        )}
      </div>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "24px" }}>
        确认推荐片段，保留需要导出的高光内容。
      </p>

      {total === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">暂无推荐片段</div>
          <div className="empty-state-desc">AI 分析完成后将在此显示候选片段</div>
        </div>
      )}

      <div className="highlight-grid">
        {props.items.map((item, index) => {
          const isSelected = props.selectedHighlightIds.includes(index);
          const scorePercent = Math.min(100, Math.round((item.score ?? 0) * 10));

          return (
            <article
              key={`${item.start}-${item.end}-${index}`}
              className={`highlight-card${isSelected ? " selected" : " removed"}`}
            >
              <div className="highlight-card-header">
                <span className="highlight-card-time">
                  ⏱ {item.start}s – {item.end}s
                </span>
                {item.star_label && (
                  <span className="highlight-badge">{item.star_label}</span>
                )}
              </div>

              <div className="highlight-summary">{item.summary}</div>
              <div className="highlight-reason">{item.reason}</div>

              <div className="score-bar-wrapper">
                <span className="score-bar-label">评分</span>
                <div className="score-bar-track">
                  <div
                    className="score-bar-fill"
                    style={{ width: `${scorePercent}%` }}
                  />
                </div>
                <span className="score-bar-value">{item.score}</span>
              </div>

              <div className="highlight-card-actions">
                <button
                  type="button"
                  className={`btn btn-sm ${isSelected ? "btn-success" : "btn-ghost"}`}
                  onClick={() => props.onKeep(index)}
                  disabled={isSelected}
                >
                  ✓ 保留
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${!isSelected ? "btn-danger" : "btn-ghost"}`}
                  onClick={() => props.onRemove(index)}
                  disabled={!isSelected}
                >
                  ✕ 移除
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {props.submitError && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {props.submitError}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={props.onSubmit}
          disabled={props.submitting || props.selectedHighlightIds.length === 0}
        >
          {props.submitting ? (
            <>
              <span className="spinner" />
              正在导出...
            </>
          ) : (
            <>🚀 提交审核并导出</>
          )}
        </button>
      </div>
    </section>
  );
}
