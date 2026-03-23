import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";

test("renders Chinese sidebar navigation", () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppShell />
    </MemoryRouter>,
  );

  expect(screen.getByText("视频剪辑")).toBeInTheDocument();
  expect(screen.getByText("API Key 管理")).toBeInTheDocument();
});
