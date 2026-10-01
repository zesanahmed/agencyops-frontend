import type { Role } from "@/types/domain";

/**
 * Demo credentials come from NEXT_PUBLIC_DEMO_* env vars — never hardcoded.
 * Each var must be referenced literally so Next can inline it at build time.
 */
export interface DemoAccount {
  role: Role;
  label: string;
  blurb: string;
  email?: string;
  password?: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "OWNER", label: "Owner", blurb: "Full control: members, teams, projects, settings.", email: process.env.NEXT_PUBLIC_DEMO_OWNER_EMAIL, password: process.env.NEXT_PUBLIC_DEMO_OWNER_PASSWORD },
  { role: "MANAGER", label: "Manager", blurb: "Runs projects and sprints; invites people.", email: process.env.NEXT_PUBLIC_DEMO_MANAGER_EMAIL, password: process.env.NEXT_PUBLIC_DEMO_MANAGER_PASSWORD },
  { role: "TEAM_MEMBER", label: "Team member", blurb: "Works assigned tasks and collaborates.", email: process.env.NEXT_PUBLIC_DEMO_MEMBER_EMAIL, password: process.env.NEXT_PUBLIC_DEMO_MEMBER_PASSWORD },
];

export const isDemoConfigured = (a: DemoAccount) => Boolean(a.email && a.password);
