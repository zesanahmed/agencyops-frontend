import { Crown, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABEL } from "@/lib/rbac";
import type { Role } from "@/types/domain";

const ICON = { OWNER: Crown, MANAGER: Shield, TEAM_MEMBER: User } as const;

export function RoleBadge({ role }: { role: Role }) {
  const Icon = ICON[role];
  return (
    <Badge tone={role === "OWNER" ? "primary" : role === "MANAGER" ? "info" : "neutral"}>
      <Icon className="size-3" aria-hidden />
      {ROLE_LABEL[role]}
    </Badge>
  );
}
