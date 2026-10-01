"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { toErrorMessage } from "@/lib/api/errors";

/** Mutation wrapper: toasts success/failure and invalidates the given query prefixes. */
export function useAction<TVars, TData = unknown>(opts: {
  fn: (vars: TVars) => Promise<TData>;
  invalidate?: QueryKey[];
  success?: string | ((data: TData, vars: TVars) => string);
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: opts.fn,
    onSuccess: async (data, vars) => {
      await Promise.all((opts.invalidate ?? []).map((queryKey) => qc.invalidateQueries({ queryKey })));
      if (opts.success) toast.success(typeof opts.success === "function" ? opts.success(data, vars) : opts.success);
    },
    onError: (e) => toast.error(toErrorMessage(e)),
  });
}
