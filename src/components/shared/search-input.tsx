"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useUrlState } from "@/hooks/use-url-state";

/** Debounced search that syncs to `?search=`. */
export function SearchInput({ placeholder = "Search…", param = "search", label = "Search" }: { placeholder?: string; param?: string; label?: string }) {
  const { get, set } = useUrlState();
  const urlValue = get(param);
  const [value, setValue] = useState(urlValue);
  const [seenUrl, setSeenUrl] = useState(urlValue);
  const debounced = useDebounce(value, 300);

  // Adopt external URL changes (back/forward, clear filters) during render, not in an effect.
  if (urlValue !== seenUrl) {
    setSeenUrl(urlValue);
    setValue(urlValue);
  }
  useEffect(() => {
    if (debounced !== urlValue) set({ [param]: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input type="search" aria-label={label} placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} className="pl-8" />
    </div>
  );
}
