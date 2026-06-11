"use client";

import OnlineResultsView from "@/components/game/OnlineResultsView";
import { useRouter } from "next/navigation";

export default function OnlineResults() {
  const router = useRouter();

  return (
    <OnlineResultsView
      onComplete={() => router.push("/online-play")}
    />
  );
}