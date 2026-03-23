import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { ProfileForm } from "./ProfileForm";

test("renders Chinese labels for profile management", () => {
  render(<ProfileForm onSaved={vi.fn()} />);

  expect(screen.getByLabelText("配置名称")).toBeInTheDocument();
  expect(screen.getByLabelText("Base URL")).toBeInTheDocument();
  expect(screen.getByLabelText("API Key")).toBeInTheDocument();
  expect(screen.getByLabelText("模型名称")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "测试连接" })).toBeInTheDocument();
});
