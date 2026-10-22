import type { Role } from "@/types/domain";

/**
 * One-click demo accounts: the users created by the backend's `npm run seed` (FRONTEND_CONTRACT §1, org "Brightline Studio").
 * They are public demo accounts by design (the assignment requires working credentials for evaluators). Each can be
 * overridden with a NEXT_PUBLIC_DEMO_* env var, e.g. to point at a different backend's seed. Each var must be
 * referenced literally so Next can inline it at build time.
 */
const SEED_PASSWORD = "DemoPass123!";
export interface DemoAccount {
  role: Role;
  label: string;
  blurb: string;
  email?: string;
  password?: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "OWNER", label: "Owner", blurb: "Full control: members, teams, projects, settings.", email: process.env.NEXT_PUBLIC_DEMO_OWNER_EMAIL || "owner@demo.agencyops.test", password: process.env.NEXT_PUBLIC_DEMO_OWNER_PASSWORD || SEED_PASSWORD },
  { role: "MANAGER", label: "Manager", blurb: "Runs projects and sprints; invites people.", email: process.env.NEXT_PUBLIC_DEMO_MANAGER_EMAIL || "manager@demo.agencyops.test", password: process.env.NEXT_PUBLIC_DEMO_MANAGER_PASSWORD || SEED_PASSWORD },
  { role: "TEAM_MEMBER", label: "Team member", blurb: "Works assigned tasks and collaborates.", email: process.env.NEXT_PUBLIC_DEMO_MEMBER_EMAIL || "member@demo.agencyops.test", password: process.env.NEXT_PUBLIC_DEMO_MEMBER_PASSWORD || SEED_PASSWORD },
];

export const isDemoConfigured = (a: DemoAccount) => Boolean(a.email && a.password);
