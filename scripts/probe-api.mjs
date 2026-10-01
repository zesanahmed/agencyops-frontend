#!/usr/bin/env node
/**
 * Contract probe: exercises the real backend and prints the SHAPE of each
 * response (keys/types only, values redacted) so src/lib/api/mappers.ts and
 * pagination.ts can be verified instead of guessed.
 *
 *   BASE=https://agencyops-api.vercel.app/api/v1 node scripts/probe-api.mjs
 *
 * It registers a throwaway user (probe-<ts>@example.com) and creates a sample
 * organization/team/project/task/comment in it. Run against a dev database.
 */
const BASE = (process.env.BASE ?? "http://localhost:5000/api/v1").replace(/\/$/, "");
const stamp = Date.now();
let token = "";
const ids = {};

function shape(v, depth = 0) {
  if (v === null) return "null";
  if (Array.isArray(v)) return v.length ? [shape(v[0], depth + 1), `(+${v.length - 1} more)`] : [];
  if (typeof v === "object") {
    if (depth > 4) return "{…}";
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x, depth + 1)]));
  }
  return typeof v;
}

async function call(label, method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  console.log(`\n### ${label}  ${method} ${path}  -> ${res.status}`);
  console.log(JSON.stringify(shape(json), null, 2));
  return json;
}

const email = `probe-${stamp}@example.com`;
const password = "StrongPassword123!";

const reg = await call("register", "POST", "/auth/register", { name: "Probe User", email, password });
token = reg?.data?.accessToken ?? "";
if (!token) { console.error("No access token; aborting."); process.exit(1); }

await call("me", "GET", "/auth/me");
await call("bad login (error envelope)", "POST", "/auth/login", { email, password: "wrong-password-1" });
await call("validation error envelope", "POST", "/auth/register", { name: "", email: "nope", password: "x" });

const org = await call("create org", "POST", "/organizations", { name: `Probe Org ${stamp}` });
ids.org = org?.data?.id ?? org?.data?.organization?.id;
await call("list orgs", "GET", "/organizations?page=1&limit=20");
await call("get org", "GET", `/organizations/${ids.org}`);
const members = await call("list members", "GET", `/organizations/${ids.org}/members?page=1&limit=20`);
await call("create invitation", "POST", `/organizations/${ids.org}/invitations`, { email: `invitee-${stamp}@example.com`, role: "TEAM_MEMBER" });
await call("list invitations", "GET", `/organizations/${ids.org}/invitations`);
const team = await call("create team", "POST", `/organizations/${ids.org}/teams`, { name: "Platform", description: "Probe" });
ids.team = team?.data?.id;
await call("list teams", "GET", `/organizations/${ids.org}/teams`);
await call("list team members", "GET", `/organizations/${ids.org}/teams/${ids.team}/members`);
const project = await call("create project", "POST", `/organizations/${ids.org}/projects`, { name: `Probe Project ${stamp}` });
ids.project = project?.data?.id;
await call("list projects", "GET", `/organizations/${ids.org}/projects?page=1&limit=5&sortBy=createdAt&sortOrder=desc`);
await call("list project teams", "GET", `/organizations/${ids.org}/projects/${ids.project}/teams`);
await call("create sprint", "POST", `/organizations/${ids.org}/projects/${ids.project}/sprints`, { name: "Sprint 1", goal: "Probe", startDate: "2026-10-01T00:00:00.000Z", endDate: "2026-10-14T00:00:00.000Z" });
const membershipId = members?.data?.[0]?.id ?? members?.data?.items?.[0]?.id;
const task = await call("create task", "POST", `/organizations/${ids.org}/projects/${ids.project}/tasks`, { title: "Probe task", priority: "HIGH", ...(membershipId ? { assigneeMembershipId: membershipId } : {}) });
ids.task = task?.data?.id;
await call("list tasks", "GET", `/organizations/${ids.org}/projects/${ids.project}/tasks?page=1&limit=5`);
await call("create subtask", "POST", `/organizations/${ids.org}/projects/${ids.project}/tasks/${ids.task}/subtasks`, { title: "Probe subtask" });
await call("list collaborators", "GET", `/organizations/${ids.org}/projects/${ids.project}/tasks/${ids.task}/collaborators`);
await call("create comment", "POST", `/organizations/${ids.org}/projects/${ids.project}/tasks/${ids.task}/comments`, { content: "Probe comment" });
await call("list comments", "GET", `/organizations/${ids.org}/projects/${ids.project}/tasks/${ids.task}/comments`);
await call("list notifications", "GET", `/organizations/${ids.org}/notifications?page=1&limit=5`);
await call("list notification preferences", "GET", `/organizations/${ids.org}/notifications/preferences`);
console.log("\nDone. Paste this output back to tighten mappers.ts / pagination.ts.");
