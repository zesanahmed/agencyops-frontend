"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { applyMention, findMentionQuery, suggestMembers, type MentionMember } from "./mentions";

/**
 * A textarea with `@` autocomplete. Type "@" and a few letters, then pick a teammate with the mouse or
 * ↑ ↓ and Enter/Tab; Esc dismisses. It only edits text: who actually gets notified is derived from the final text.
 */
export function MentionInput({ value, onChange, members, label, placeholder, disabled, invalid }: {
  value: string; onChange: (value: string) => void; members: MentionMember[];
  label: string; placeholder?: string; disabled?: boolean; invalid?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const token = findMentionQuery(value, caret);
  const suggestions = token && dismissedAt !== token.start ? suggestMembers(members, token.query) : [];
  const open = suggestions.length > 0;
  const activeIndex = Math.min(active, Math.max(0, suggestions.length - 1));

  useLayoutEffect(() => {
    if (pendingCaret.current !== null && ref.current) {
      ref.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  });

  function pick(m: MentionMember) {
    if (!token) return;
    const next = applyMention(value, caret, token.start, m.name);
    pendingCaret.current = next.caret;
    setCaret(next.caret);
    setActive(0);
    onChange(next.text);
    ref.current?.focus();
  }

  return (
    <div className="relative">
      <Textarea ref={ref} role="combobox" aria-label={label} aria-expanded={open} aria-autocomplete="list" aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={open ? `${id}-opt-${activeIndex}` : undefined} aria-invalid={invalid} disabled={disabled} placeholder={placeholder} value={value}
        onChange={(e) => { onChange(e.target.value); setCaret(e.target.selectionStart); setActive(0); setDismissedAt(null); }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((activeIndex + 1) % suggestions.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((activeIndex - 1 + suggestions.length) % suggestions.length); }
          else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(suggestions[activeIndex]); }
          else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setDismissedAt(token?.start ?? null); }
        }} />
      {open ? (
        <ul id={`${id}-list`} role="listbox" aria-label="Mention suggestions" className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-surface p-1 shadow-md">
          {suggestions.map((m, i) => (
            <li key={m.id} id={`${id}-opt-${i}`} role="option" aria-selected={i === activeIndex}
              className={cn("cursor-pointer rounded-sm px-2.5 py-1.5 text-sm", i === activeIndex ? "bg-surface-muted text-foreground" : "text-muted-foreground")}
              onMouseDown={(e) => { e.preventDefault(); pick(m); }} onMouseEnter={() => setActive(i)}>
              @{m.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
