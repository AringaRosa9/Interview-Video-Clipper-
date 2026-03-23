import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AppRoutes } from "./routes";

function LocationDisplay() {
  const { pathname } = useLocation();

  return <div data-testid="pathname">{pathname}</div>;
}

function renderAt(initialPath: string) {
  render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <LocationDisplay />
      <AppRoutes />
    </MemoryRouter>,
  );
}

test("/clipping route renders the clipping heading", async () => {
  renderAt("/clipping");

  expect(await screen.findByRole("heading", { name: "视频剪辑" })).toBeInTheDocument();
});

test("/profiles route renders the profiles heading", async () => {
  renderAt("/profiles");

  expect(await screen.findByRole("heading", { name: "API Key 管理" })).toBeInTheDocument();
});

test("root route redirects to /clipping", async () => {
  renderAt("/");

  expect(await screen.findByRole("heading", { name: "视频剪辑" })).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByTestId("pathname")).toHaveTextContent("/clipping");
  });
});
