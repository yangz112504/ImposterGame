"use client";

import OnlineVotingView from "@/components/game/OnlineVotingView";
import { useRouter, useParams } from "next/navigation";

export default function OnlineVoting() {
  const router = useRouter();
  const params = useParams();
  const room = params.room as string;

  return (
    <OnlineVotingView
      onComplete={() => router.push(`/online-play/${room}/results`)}
      onCancel={() => router.push("/online-play")}
    />
  );
}