"use client";

import OnlineGameView from "@/components/game/OnlineGameView";
import { useRouter, useParams } from "next/navigation";

export default function OnlineGame() {
  const router = useRouter();
  const params = useParams();
  const room = params.room as string;

  return (
    <OnlineGameView
      onSkip={() => router.push(`/online-play/${room}/vote`)}
      onCancel={() => router.push("/online-play")}
    />
  );
}