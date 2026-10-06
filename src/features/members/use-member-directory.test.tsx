import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fetchAllMembers, useMemberDirectory } from "./use-member-directory";
import { useAuthStore } from "@/stores/auth-store";
import type { Membership } from "@/types/domain";

const list = vi.fn();
vi.mock("@/lib/api/services", () => ({ memberApi: { list: (...a: unknown[]) => list(...a) } }));

const m = (id: string, name: string): Membership => ({ id, userId: `u-${id}`, organizationId: "o1", role: "TEAM_MEMBER", status: "ACTIVE", joinedAt: "", name, email: `${name}@x.io`, avatarUrl: null });
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;

describe("member directory", () => {
  beforeEach(() => { list.mockReset(); useAuthStore.setState({ status: "authenticated" }); });

  it("fetches every page at the backend's max page size, stopping at totalPages", async () => {
    list.mockResolvedValueOnce({ items: [m("1", "Ann")], meta: { page: 1, limit: 100, total: 2, totalPages: 2 } })
        .mockResolvedValueOnce({ items: [m("2", "Ben")], meta: { page: 2, limit: 100, total: 2, totalPages: 2 } });
    const all = await fetchAllMembers("o1");
    expect(all.map((x) => x.name)).toEqual(["Ann", "Ben"]);
    expect(list).toHaveBeenCalledTimes(2);
    expect(list).toHaveBeenNthCalledWith(1, "o1", { page: 1, limit: 100 });
    expect(list).toHaveBeenNthCalledWith(2, "o1", { page: 2, limit: 100 });
  });

  it("resolves names by membershipId, sorted, and labels removed members", async () => {
    list.mockResolvedValue({ items: [m("2", "Zed"), m("1", "Amy")], meta: { page: 1, limit: 100, total: 2, totalPages: 1 } });
    const { result } = renderHook(() => useMemberDirectory("o1"), { wrapper });
    await waitFor(() => expect(result.current.list).toHaveLength(2));
    expect(result.current.list.map((x) => x.name)).toEqual(["Amy", "Zed"]);
    expect(result.current.nameOf("2")).toBe("Zed");
    expect(result.current.nameOf("gone")).toBe("Former member");
    expect(result.current.nameOf(null)).toBe("");
  });

  it("does not fetch while disabled (e.g. an organization we can't access)", async () => {
    renderHook(() => useMemberDirectory("o1", false), { wrapper });
    await new Promise((r) => setTimeout(r, 30));
    expect(list).not.toHaveBeenCalled();
  });
});
