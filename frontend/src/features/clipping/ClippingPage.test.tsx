import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../../app/routes";
import { createJob, exportJob, getJob, getJobHighlights, listProfiles, reviewJob } from "../../lib/api";

vi.mock("../../lib/api", () => ({
  listProfiles: vi.fn(),
  createJob: vi.fn(),
  getJob: vi.fn(),
  getJobHighlights: vi.fn(),
  reviewJob: vi.fn(),
  exportJob: vi.fn(),
}));

const baseProfile = {
  id: 1,
  name: "默认配置",
  base_url: "https://example.com/v1",
  model: "demo-model",
  is_default: true,
  created_at: "2026-03-23T00:00:00",
};

const baseJob = {
  id: 42,
  video_url: "https://cdn.example.com/interview.mp4",
  candidate_name: "候选人 A",
  profile_id: 1,
  target_duration_seconds: 45,
  status: "transcribing",
  workspace_path: "/tmp/job-42",
  failure_message: null,
  created_at: "2026-03-23T00:00:00",
};

function renderClippingRoute() {
  render(
    <MemoryRouter
      initialEntries={["/clipping"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AppRoutes />
    </MemoryRouter>,
  );
}

test("polls job status and advances to review when backend becomes ready", async () => {
  vi.mocked(listProfiles).mockResolvedValue([baseProfile]);
  vi.mocked(createJob).mockResolvedValue(baseJob);
  vi.mocked(getJob).mockResolvedValue({
    ...baseJob,
    status: "review_ready",
  });

  renderClippingRoute();

  fireEvent.change(await screen.findByLabelText("视频链接"), {
    target: { value: "https://cdn.example.com/interview.mp4" },
  });
  fireEvent.click(screen.getByRole("button", { name: "下一步：分析设置" }));

  expect(await screen.findByRole("heading", { name: "分析设置" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "开始 AI 剪辑" }));

  expect(await screen.findByRole("heading", { name: "AI 推荐片段" })).toBeInTheDocument();
  expect(getJob).toHaveBeenCalledWith(42);
});

test("renders review actions and export result after approval", async () => {
  vi.mocked(listProfiles).mockResolvedValue([baseProfile]);
  vi.mocked(createJob).mockResolvedValue(baseJob);
  vi.mocked(getJob).mockResolvedValue({
    ...baseJob,
    status: "review_ready",
  });
  vi.mocked(getJobHighlights).mockResolvedValue({
    job_id: 42,
    status: "review_ready",
    items: [
      {
        start: 5.25,
        end: 18.75,
        star_label: "Action+Result",
        summary: "优化支付系统并提升成功率",
        reason: "体现明确动作和量化结果",
        score: 0.92,
      },
      {
        start: 20,
        end: 28,
        star_label: "Situation+Task",
        summary: "补充项目背景和职责",
        reason: "覆盖情境和任务描述",
        score: 0.81,
      },
    ],
  });
  vi.mocked(reviewJob).mockResolvedValue({
    job_id: 42,
    status: "reviewed",
    approved_highlight_ids: [0],
  });
  vi.mocked(exportJob).mockResolvedValue({
    job_id: 42,
    status: "exported",
    output_file: "/tmp/job-42/final.mp4",
  });

  renderClippingRoute();

  fireEvent.change(await screen.findByLabelText("视频链接"), {
    target: { value: "https://cdn.example.com/interview.mp4" },
  });
  fireEvent.click(screen.getByRole("button", { name: "下一步：分析设置" }));

  fireEvent.click(screen.getByRole("button", { name: "开始 AI 剪辑" }));

  expect((await screen.findAllByRole("button", { name: "保留" })).length).toBe(2);
  expect(screen.getAllByRole("button", { name: "移除" })).toHaveLength(2);
  expect(screen.getAllByText(/推荐理由：/)).toHaveLength(2);
  expect(screen.getAllByText(/STAR 标签：/)).toHaveLength(2);

  fireEvent.click(screen.getAllByRole("button", { name: "保留" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "提交审核并导出" }));

  await waitFor(() => {
    expect(reviewJob).toHaveBeenCalledWith(42, {
      approved_highlight_ids: [0],
    });
  });

  expect(await screen.findByRole("link", { name: "下载成片" })).toBeInTheDocument();
  expect(exportJob).toHaveBeenCalledWith(42);
});

test("auto-selects the first profile when profiles finish loading after step 2 opens", async () => {
  let resolveProfiles: ((value: typeof baseProfile[]) => void) | undefined;
  vi.mocked(listProfiles).mockReturnValue(
    new Promise((resolve) => {
      resolveProfiles = resolve;
    }),
  );
  vi.mocked(createJob).mockResolvedValue(baseJob);
  vi.mocked(getJob).mockResolvedValue(baseJob);

  renderClippingRoute();

  fireEvent.change(await screen.findByLabelText("视频链接"), {
    target: { value: "https://cdn.example.com/interview.mp4" },
  });
  fireEvent.click(screen.getByRole("button", { name: "下一步：分析设置" }));

  expect(await screen.findByRole("heading", { name: "分析设置" })).toBeInTheDocument();
  expect(screen.getByText("请先到 API Key 管理 中创建模型配置。")).toBeInTheDocument();

  resolveProfiles?.([baseProfile]);

  await waitFor(() => {
    expect(screen.getByRole("option", { name: "默认配置 / demo-model" })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "开始 AI 剪辑" }));

  await waitFor(() => {
    expect(createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: 1,
      }),
    );
  });
});
