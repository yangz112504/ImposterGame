"use client";

import OnlineRevealView from "@/components/game/OnlineRevealView";
import { useRouter, useParams } from "next/navigation";

export default function OnlineReveal() {
  const router = useRouter();
  const params = useParams();
  const room = params.room as string;

  return (
    <OnlineRevealView
      onComplete={() => router.push(`/online-play/${room}/game`)}
      onCancel={() => router.push(`/online-play/`)}
    />
  );
}