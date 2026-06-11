"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ResultsView from "@/components/game/ResultsView";
import { useGameStore } from "@/lib/store";
import { getGameOutcome } from "@/lib/gameResults";

export default function LocalResultsPage() {
  const router = useRouter();
  const game = useGameStore((state) => state.game);

  useEffect(() => {
    if (!game) {
      router.replace("/local-play");
      return;
    }
    if (game.phase !== "results" || !game.results) {
      router.replace("/local-play/vote");
    }
  }, [game, router]);

  if (!game || game.phase !== "results" || !game.results) return null;

  const { voteTotals, topVoteCount, leaders, imposters, outcomeTitle, outcomeBody, playersWin } =
    getGameOutcome(game);

  const leaderIds = new Set(leaders.map((l) => l.id));
  const imposterIds = new Set(imposters.map((p) => p.id));

  const players = game.players.map((p) => ({
    id: p.id,
    name: p.name,
    votes: voteTotals[p.id] ?? 0,
    isImposter: imposterIds.has(p.id),
    isLeader: leaderIds.has(p.id),
  }));

  const summaryLine =
    leaders.length === 1
      ? `${leaders[0].name} received the most votes with ${topVoteCount}.`
      : leaders.length > 1
      ? `Tie between ${leaders.map((p) => p.name).join(", ")} at ${topVoteCount} votes each.`
      : "No votes were cast.";

  return (
    <ResultsView
      outcomeTitle={outcomeTitle}
      outcomeBody={outcomeBody}
      playersWin={playersWin}
      imposterNames={imposters.map((p) => p.name)}
      players={players}
      topVoteCount={topVoteCount}
      summaryLine={summaryLine}
      onBackToSetup={() => router.push("/local-play")}
    />
  );
}