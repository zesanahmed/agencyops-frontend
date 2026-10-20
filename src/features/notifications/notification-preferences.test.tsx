import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationPreferences } from "./notification-preferences";
import type { NotificationPreference } from "@/types/domain";

vi.mock("@/features/organizations/org-context", () => ({ useOrg: () => ({ organizationId: "o1" }) }));
const prefsFn = vi.fn(); const updateFn = vi.fn();
vi.mock("@/lib/api/services", () => ({ notificationApi: { preferences: (...a: unknown[]) => prefsFn(...a), updatePreference: (...a: unknown[]) => updateFn(...a) } }));
const row = (o: Partial<NotificationPreference>): NotificationPreference => ({ id: "p", notificationType: "MENTION", inAppEnabled: true, emailEnabled: true, ...o });
const setup = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><NotificationPreferences /></QueryClientProvider>);

describe("NotificationPreferences", () => {
  beforeEach(() => { prefsFn.mockReset(); updateFn.mockReset(); updateFn.mockResolvedValue(row({})); });

  it("shows Mentions on/on by default when the backend has no stored row yet", async () => {
    prefsFn.mockResolvedValue([]);
    setup();
    expect(await screen.findByRole("switch", { name: "In-app" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Email" })).toBeChecked();
    expect(screen.getByText("Mentions")).toBeInTheDocument();
  });

  it("reflects stored choices", async () => {
    prefsFn.mockResolvedValue([row({ inAppEnabled: true, emailEnabled: false })]);
    setup();
    expect(await screen.findByRole("switch", { name: "Email" })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: "In-app" })).toBeChecked();
  });

  it("saves one channel at a time for the right type", async () => {
    prefsFn.mockResolvedValue([]);
    setup();
    await userEvent.click(await screen.findByRole("switch", { name: "In-app" }));
    await waitFor(() => expect(updateFn).toHaveBeenCalledWith("o1", "MENTION", { inAppEnabled: false }));
    await userEvent.click(screen.getByRole("switch", { name: "Email" }));
    await waitFor(() => expect(updateFn).toHaveBeenLastCalledWith("o1", "MENTION", { emailEnabled: false }));
  });

  it("lists types the backend adds later, with a readable name", async () => {
    prefsFn.mockResolvedValue([row({ id: "x", notificationType: "CLIENT_MESSAGE", emailEnabled: false })]);
    setup();
    expect(await screen.findByText("Client message")).toBeInTheDocument();
    expect(screen.getByText("Mentions")).toBeInTheDocument();
  });

  it("is upfront that the backend doesn't apply the choices yet, and handles load errors", async () => {
    prefsFn.mockRejectedValue(new Error("boom"));
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load preferences");
    expect(screen.getByText(/backend doesn.t apply them to in-app notifications yet/)).toBeInTheDocument();
  });
});
