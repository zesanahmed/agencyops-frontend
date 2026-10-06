"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/api/errors";
import { ApiError } from "@/lib/api/errors";

/**
 * Mutation wrapper: toasts success/failure and invalidates the given query prefixes.
 *
 * `deferRefetch` is for DELETE mutations made from the deleted entity's own page.
 * A broad invalidation prefix also matches that page's still-mounted queries, which
 * would refetch, 404, and flash an error before navigation completes. With
 * `deferRefetch` the queries are only marked stale (refetchType "none"); lists
 * refetch when they next mount after the caller navigates away. (Removing the
 * queries instead doesn't help: a mounted observer just recreates and refetches them.)
 */
export function useAction<TVars, TData = unknown>(opts: {
  fn: (vars: TVars) => Promise<TData>;
  invalidate?: QueryKey[];
  deferRefetch?: boolean;
  success?: string | ((data: TData, vars: TVars) => string);
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: opts.fn,
    onSuccess: async (data, vars) => {
      await Promise.all((opts.invalidate ?? []).map((queryKey) => qc.invalidateQueries({ queryKey, refetchType: opts.deferRefetch ? "none" : "active" })));
      if (opts.success) toast.success(typeof opts.success === "function" ? opts.success(data, vars) : opts.success);
    },
    onError: (e) => {
      toast.error(toErrorMessage(e));
      // A 403 means our idea of the caller's role is stale (e.g. demoted since the directory was cached): refresh it.
      if (e instanceof ApiError && e.isForbidden) {
        void qc.invalidateQueries({ queryKey: ["organizations"], predicate: (q) => q.queryKey[2] === "member-directory" });
      }
    },
  });
}
