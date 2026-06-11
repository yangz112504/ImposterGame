"use client";

import { useRouter } from "next/navigation";
import GamePage from "@/components/game/GameView"; 
import { useGameStore } from "@/lib/store";

export default function Page() {
  const router = useRouter();
  const clearGame = useGameStore((state) => state.clearGame);

  return (
    <GamePage 
      onTimeUp={() => router.push("/local-play/vote")}
      onSkip={() => router.push("/local-play/vote")}
      onExit={() => {
        clearGame();
        router.push("/local-play");
      }}
      isOnline={false} 
    />
  );
}
