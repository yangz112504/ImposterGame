"use client";

import { useOnlineLobbyStore } from "@/lib/onlineLobbyStore";
import ResultsView from "@/components/game/ResultsView";

interface Props {
  onComplete: () => void;
}

export default function OnlineResultsView({ onComplete }: Props) {
  const isHost = useOnlineLobbyStore((s) => s.isHost);
  const results = useOnlineLobbyStore((s) => s.results);
  const players = useOnlineLobbyStore((s) => s.players);
  const leaveGame = useOnlineLobbyStore((s) => s.leaveGame);

  if (!results) {
    return (
      <div className="font-homepage flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-lg animate-pulse">Loading results...</div>
      </div>
    );
  }

  const { voteTotals, leaderNames, topVoteCount, playersWin, outcomeMessage, imposterName } = results;

  const leaderSet = new Set(leaderNames);
  const playerResults = players.map((name) => ({
    id: name,
    name,
    votes: voteTotals[name] ?? 0,
    isImposter: name === imposterName,
    isLeader: leaderSet.has(name),
  }));

  const outcomeTitle = playersWin ? "Players Win" : "Imposter Wins";

  const summaryLine = leaderNames.length === 1
    ? `${leaderNames[0]} received the most votes with ${topVoteCount}.`
    : leaderNames.length > 1
    ? `Tie between ${leaderNames.join(", ")} at ${topVoteCount} votes each.`
    : "No votes were cast.";

  const handleBackToSetup = () => {
    leaveGame();
    onComplete();
  };

  return (
    <ResultsView
      outcomeTitle={outcomeTitle}
      outcomeBody={outcomeMessage}
      playersWin={playersWin}
      imposterNames={[imposterName]}
      players={playerResults}
      topVoteCount={topVoteCount}
      summaryLine={summaryLine}
      onBackToSetup={handleBackToSetup}
      backLabel={isHost ? "Back to Lobby" : "Leave Game"}
    />
  );
}