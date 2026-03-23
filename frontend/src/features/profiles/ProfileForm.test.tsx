import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { ProfileForm } from "./ProfileForm";
import type { Profile } from "../../lib/types";
import { testProfileConnection } from "../../lib/api";

vi.mock("../../lib/api", () => ({
  createProfile: vi.fn(),
  updateProfile: vi.fn(),
  testProfileConnection: vi.fn(),
}));

test("renders Chinese labels for profile management", () => {
  render(<ProfileForm onSaved={vi.fn()} />);

  expect(screen.getByLabelText("配置名称")).toBeInTheDocument();
  expect(screen.getByLabelText("接口地址")).toBeInTheDocument();
  expect(screen.getByLabelText("接口密钥")).toBeInTheDocument();
  expect(screen.getByLabelText("模型名称")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("例如：https://api.openai.com/v1")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("请输入接口密钥")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("例如：gpt-4.1-mini")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "测试连接" })).toBeInTheDocument();
});

function ProfileFormHarness() {
  const [selectedProfile, setSelectedProfile] = useState<Profile | undefined>(undefined);

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          setSelectedProfile({
            id: 1,
            name: "默认配置",
            base_url: "https://example.com/v1",
            model: "demo-model",
            is_default: true,
            created_at: "2026-03-23T00:00:00",
          })
        }
      >
        选择已有配置
      </button>
      <ProfileForm
        onSaved={vi.fn()}
        profile={selectedProfile}
        onCancelEdit={() => setSelectedProfile(undefined)}
      />
    </div>
  );
}

test("can return from edit mode to create mode without reload", () => {
  render(<ProfileFormHarness />);

  expect(screen.getByRole("heading", { name: "新建配置" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "选择已有配置" }));

  expect(screen.getByRole("heading", { name: "编辑配置" })).toBeInTheDocument();
  expect(screen.getByDisplayValue("默认配置")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "取消编辑" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "取消编辑" }));

  expect(screen.getByRole("heading", { name: "新建配置" })).toBeInTheDocument();
  expect(screen.queryByDisplayValue("默认配置")).not.toBeInTheDocument();
});

test("clears stale errors and status when returning from edit mode to create mode", async () => {
  vi.mocked(testProfileConnection).mockResolvedValueOnce({
    status: "ok",
    message: "连接成功",
  });

  render(<ProfileFormHarness />);

  fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
  expect(screen.getByText("请输入配置名称")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "选择已有配置" }));

  fireEvent.change(screen.getByLabelText("接口密钥"), {
    target: { value: "sk-test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "测试连接" }));

  expect(await screen.findByText("连接成功")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "取消编辑" }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "新建配置" })).toBeInTheDocument();
  });
  expect(screen.queryByText("请输入配置名称")).not.toBeInTheDocument();
  expect(screen.queryByText("连接成功")).not.toBeInTheDocument();
});
