import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Remembers the last-used organization id (non-sensitive) to preselect on next visit. */
interface OrgState {
  lastOrganizationId: string | null;
  setLast: (id: string | null) => void;
}

export const useOrgStore = create<OrgState>()(
  persist((set) => ({ lastOrganizationId: null, setLast: (id) => set({ lastOrganizationId: id }) }), { name: "agencyops-active-org" }),
);
