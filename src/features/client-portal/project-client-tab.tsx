"use client";

import { useUrlState } from "@/hooks/use-url-state";
import { cn } from "@/lib/utils";
import { FilesPanel } from "./files-panel";
import { MessagesPanel } from "./messages-panel";
import { RequestsList } from "./requests-list";
import { UpdatesPanel } from "./updates-panel";

const SECTIONS = [
  { id: "updates", label: "Updates" }, { id: "messages", label: "Messages" }, { id: "files", label: "Files" }, { id: "requests", label: "Requests" },
] as const;
type Section = (typeof SECTIONS)[number]["id"];

/** Everything the client sees and says about one project. The section lives in the URL (?section=); switching drops list state. */
export function ProjectClientTab({ projectId }: { projectId: string }) {
  const { get, set } = useUrlState();
  const raw = get("section");
  const section: Section = SECTIONS.some((s) => s.id === raw) ? (raw as Section) : "updates";
  const go = (id: Section) => set({ section: id === "updates" ? "" : id, page: "", status: "", type: "" });

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">What the client sees on their portal for this project. Only contacts you&apos;ve granted access to can see it.</p>
      <nav aria-label="Client area sections" className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" aria-current={section === s.id ? "page" : undefined} onClick={() => go(s.id)}
            className={cn("rounded-full border px-3 py-1 text-sm transition-colors", section === s.id ? "border-primary bg-primary-soft font-medium text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{s.label}</button>
        ))}
      </nav>
      {section === "updates" ? <UpdatesPanel projectId={projectId} />
        : section === "messages" ? <MessagesPanel projectId={projectId} />
        : section === "files" ? <FilesPanel projectId={projectId} />
        : <RequestsList projectId={projectId} />}
    </div>
  );
}
