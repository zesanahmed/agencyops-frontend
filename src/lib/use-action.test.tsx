import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useAction } from "./use-action";
import { ApiError } from "./api/errors";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const KEY = ["organizations", "o1", "projects", "p1"];
const PREFIX = ["organizations", "o1", "projects"];

function setup(deferRefetch: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(KEY, { name: "Doomed project" });
  const detailFetch = vi.fn().mockRejectedValue(new ApiError(404, "Project not found"));
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => ({
    // The still-mounted detail page's query for the entity being deleted.
    detail: useQuery({ queryKey: KEY, queryFn: detailFetch, staleTime: Infinity }),
    del: useAction({ fn: async () => null, invalidate: [PREFIX], deferRefetch }),
  }), { wrapper });
  return { qc, result, detailFetch };
}

describe("useAction", () => {
  it("without `remove`, a broad invalidation refetches the deleted entity's own query (the 404 flash)", async () => {
    const { result, detailFetch } = setup(false);
    await act(async () => { await result.current.del.mutateAsync(); });
    await waitFor(() => expect(detailFetch).toHaveBeenCalled());
  });

  it("with `deferRefetch`, the mounted detail query is marked stale but NOT refetched (no 404 flash)", async () => {
    const { qc, result, detailFetch } = setup(true);
    await act(async () => { await result.current.del.mutateAsync(); });
    await new Promise((r) => setTimeout(r, 50));
    expect(detailFetch).not.toHaveBeenCalled();
    expect(qc.getQueryState(KEY)?.isInvalidated).toBe(true);
  });

  it("stale queries refetch when a page mounts them later (the list after navigation)", async () => {
    const { qc, result } = setup(true);
    await act(async () => { await result.current.del.mutateAsync(); });
    const listFetch = vi.fn().mockResolvedValue({ items: [] });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    qc.setQueryData([...PREFIX, "list"], { items: ["stale"] });
    await qc.invalidateQueries({ queryKey: PREFIX, refetchType: "none" });
    renderHook(() => useQuery({ queryKey: [...PREFIX, "list"], queryFn: listFetch, staleTime: 30_000 }), { wrapper });
    await waitFor(() => expect(listFetch).toHaveBeenCalledTimes(1));
  });

  it("refreshes the member directory after a 403 (the cached role may be stale)", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const spy = vi.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useAction({ fn: async () => { throw new ApiError(403, "You don't have permission"); } }), { wrapper });
    await act(async () => { await result.current.mutateAsync(undefined).catch(() => undefined); });
    expect(spy).toHaveBeenCalledTimes(1);
    const arg = spy.mock.calls[0][0]!;
    expect(arg.predicate!({ queryKey: ["organizations", "o1", "member-directory", {}] } as never)).toBe(true);
    expect(arg.predicate!({ queryKey: ["organizations", "o1", "projects", {}] } as never)).toBe(false);
  });

  it("does not refresh the directory for non-403 errors", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const spy = vi.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useAction({ fn: async () => { throw new ApiError(409, "conflict"); } }), { wrapper });
    await act(async () => { await result.current.mutateAsync(undefined).catch(() => undefined); });
    expect(spy).not.toHaveBeenCalled();
  });

  it("derives invalidation from the call's arguments (assigning a team to different projects)", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const spy = vi.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useAction({
      fn: async (v: { projectId: string }) => v.projectId,
      invalidate: (v, data) => [["organizations", "o1", "projects", v.projectId, "teams"], ["echo", data]],
    }), { wrapper });
    await act(async () => { await result.current.mutateAsync({ projectId: "p9" }); });
    const keys = spy.mock.calls.map((c) => c[0]!.queryKey);
    expect(keys).toEqual([["organizations", "o1", "projects", "p9", "teams"], ["echo", "p9"]]);
  });
});
