export interface MentionMember { id: string; name: string }

/** Backend limit on mentionedMembershipIds per comment. */
export const MAX_MENTIONS = 50;
const MAX_QUERY = 40;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** `@name` as a whole mention: preceded by start/non-word, and not followed by more name characters (so @Ann is not @Annabel). */
const mentionRegExp = (name: string, flags = "u") => new RegExp(`(^|[^\\p{L}\\p{N}_])@${escapeRegExp(name)}(?![\\p{L}\\p{N}_])`, flags);

/**
 * The membership ids actually mentioned in the text. Derived from the final text rather than tracked separately,
 * so deleting "@Ben" before sending can't still notify Ben. Capped at the backend limit.
 */
export function extractMentionIds(text: string, members: MentionMember[]): string[] {
  const ids: string[] = [];
  for (const m of members) {
    if (m.name && mentionRegExp(m.name).test(text) && !ids.includes(m.id)) ids.push(m.id);
  }
  return ids.slice(0, MAX_MENTIONS);
}

export interface TextPart { text: string; mention: boolean }

/** Splits text into plain and `@Name` parts for known members, so mentions can be highlighted without any HTML injection. */
export function splitMentions(text: string, names: string[]): TextPart[] {
  const known = [...new Set(names.filter(Boolean))].sort((a, b) => b.length - a.length); // longest first
  if (!known.length) return [{ text, mention: false }];
  const re = new RegExp(`(^|[^\\p{L}\\p{N}_])(@(?:${known.map(escapeRegExp).join("|")}))(?![\\p{L}\\p{N}_])`, "gu");
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const start = (m.index ?? 0) + m[1].length;
    if (start > last) parts.push({ text: text.slice(last, start), mention: false });
    parts.push({ text: m[2], mention: true });
    last = start + m[2].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), mention: false });
  return parts.length ? parts : [{ text, mention: false }];
}

export interface MentionQuery { start: number; query: string }

/** If the caret is inside an `@query` token (the `@` at the start or after whitespace), returns where it starts and what was typed. */
export function findMentionQuery(text: string, caret: number): MentionQuery | null {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;
  if (at > 0 && !/\s/.test(before[at - 1])) return null;
  const query = before.slice(at + 1);
  if (query.length > MAX_QUERY || /[\n\r]/.test(query)) return null;
  return { start: at, query };
}

/**
 * Members matching what was typed after "@": names starting with it first, then names containing it.
 * The query is NOT trimmed: "Bea " (a finished name followed by a space) matches nobody so the list closes,
 * while "Zesan " still matches "Zesan Ahmed" for multi-word names.
 */
export function suggestMembers(members: MentionMember[], query: string, limit = 6): MentionMember[] {
  const q = query.toLowerCase();
  const starts: MentionMember[] = []; const contains: MentionMember[] = [];
  for (const m of members) {
    const n = m.name.toLowerCase();
    if (n.startsWith(q)) starts.push(m); else if (q && n.includes(q)) contains.push(m);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** Replaces the `@query` token with `@Name ` and returns the new text and where the caret should go. */
export function applyMention(text: string, caret: number, start: number, name: string): { text: string; caret: number } {
  const inserted = `@${name} `;
  return { text: text.slice(0, start) + inserted + text.slice(caret), caret: start + inserted.length };
}
