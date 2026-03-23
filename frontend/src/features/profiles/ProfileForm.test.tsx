import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { ProfileForm } from "./ProfileForm";

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
