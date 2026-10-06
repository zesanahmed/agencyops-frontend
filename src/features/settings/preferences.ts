import type { NotificationPreference } from "@/types/domain";

/**
 * The backend creates preference rows lazily (PUT upserts), so GET returns an
 * EMPTY list for anyone who never changed a setting. Both channels default to
 * enabled (prisma NotificationPreference defaults), so the effective state of a
 * type with no row is "on / on". `MENTION` is the only type the backend emits
 * today; extra types returned by the API are shown after it.
 */
export const KNOWN_NOTIFICATION_TYPES = ["MENTION"] as const;

export interface EffectivePreference {
  notificationType: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  /** false when this is just the default (no row stored yet). */
  stored: boolean;
}

export function mergePreferences(rows: NotificationPreference[], known: readonly string[] = KNOWN_NOTIFICATION_TYPES): EffectivePreference[] {
  const byType = new Map(rows.map((r) => [r.notificationType, r]));
  const fromKnown = known.map((type): EffectivePreference => {
    const r = byType.get(type);
    return r ? { notificationType: type, inAppEnabled: r.inAppEnabled, emailEnabled: r.emailEnabled, stored: true } : { notificationType: type, inAppEnabled: true, emailEnabled: true, stored: false };
  });
  const extras = rows
    .filter((r) => !known.includes(r.notificationType))
    .map((r): EffectivePreference => ({ notificationType: r.notificationType, inAppEnabled: r.inAppEnabled, emailEnabled: r.emailEnabled, stored: true }));
  return [...fromKnown, ...extras];
}
