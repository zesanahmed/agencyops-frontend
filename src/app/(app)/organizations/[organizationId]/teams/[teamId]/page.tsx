import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamDetail } from "@/features/teams/team-detail";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <Suspense><TeamDetail teamId={teamId} /></Suspense>;
}
