/** Central TanStack Query keys. All org-scoped keys start with ["organizations", id] so one prefix invalidates a whole tenant. */
export const qk = {
  orgs: ["organizations"] as const,
  org: (id: string) => ["organizations", id] as const,
  memberDirectory: (id: string) => ["organizations", id, "member-directory"] as const,
  members: (id: string, p?: object) => ["organizations", id, "members", p ?? {}] as const,
  invitations: (id: string, p?: object) => ["organizations", id, "invitations", p ?? {}] as const,
  teams: (id: string, p?: object) => ["organizations", id, "teams", p ?? {}] as const,
  team: (id: string, t: string) => ["organizations", id, "teams", t] as const,
  teamMembers: (id: string, t: string) => ["organizations", id, "teams", t, "members"] as const,
  projects: (id: string, p?: object) => ["organizations", id, "projects", p ?? {}] as const,
  project: (id: string, p: string) => ["organizations", id, "projects", p] as const,
  projectTeams: (id: string, p: string) => ["organizations", id, "projects", p, "teams"] as const,
  sprints: (id: string, p: string) => ["organizations", id, "projects", p, "sprints"] as const,
  tasks: (id: string, p: string, q?: object) => ["organizations", id, "projects", p, "tasks", q ?? {}] as const,
  task: (id: string, p: string, t: string) => ["organizations", id, "projects", p, "tasks", t] as const,
  notifications: (id: string, p?: object) => ["organizations", id, "notifications", p ?? {}] as const,
  prefs: (id: string) => ["organizations", id, "notification-prefs"] as const,
};
