"use client";

import { Select } from "@/components/ui/input";
import { useUrlState } from "@/hooks/use-url-state";

export function FilterSelect({ param, label, options, allLabel }: {
  param: string; label: string; options: { value: string; label: string }[]; allLabel: string;
}) {
  const { get, set } = useUrlState();
  return (
    <Select aria-label={label} value={get(param)} onChange={(e) => set({ [param]: e.target.value })} className="w-auto min-w-36">
      <option value="">{allLabel}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  );
}
