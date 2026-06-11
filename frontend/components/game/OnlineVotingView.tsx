"use client";

import { useEffect, useRef, useState } from "react";
import { useOnlineLobbyStore } from "@/lib/onlineLobbyStore";
import VotingView from "@/components/game/VotingView";

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

export default function OnlineVotingView({ onComplete, onCancel }: Props) {
  const players = useOnlineLobbyStore((s) => s.players);
  const isHost = useOnlineLobbyStore((s) => s.isHost);
  const voteLocked = useOnlineLobbyStore((s) => s.voteLocked);
  const voteTotal = useOnlineLobbyStore((s) => s.voteTotal);
  const allLocked = useOnlineLobbyStore((s) => s.allLocked);
  const phase = useOnlineLobbyStore((s) => s.phase);
  const leaveGame = useOnlineLobbyStore((s) => s.leaveGame);
  const sendVote = useOnlineLobbyStore((s) => s.sendVote);
  const sendLockVote = useOnlineLobbyStore((s) => s.sendLockVote);
  const sendRevealResults = useOnlineLobbyStore((s) => s.sendRevealResults);


  const [selectedTargetPlayerId, setSelectedTargetPlayerId] = useState<string | null>(null);
  const [hasLocked, setHasLocked] = useState(false);

  const prevPhase = useRef(phase);
  useEffect(() => {
    if (prevPhase.current === "voting" && phase === "results") {
      onComplete();
    }
    prevPhase.current = phase;
  }, [phase, onComplete]);

  const handleExit = () => {
    leaveGame();
    onCancel();
  };

  // Build PlayerRole objects from player names for VotingView
  const playerRoles = players.map((name) => ({
    id: name,
    name,
    role: "innocent" as const,
  }));

  const handleSelectTarget = (playerId: string) => {
    if (hasLocked) return;
    setSelectedTargetPlayerId(playerId);
    sendVote(playerId); // playerId is the name in online mode
  };

  const handleLockVote = () => {
    if (!selectedTargetPlayerId || hasLocked) return;
    setHasLocked(true);
    sendLockVote();
  };

  if (!players.length) {
    return (
      <div className="font-homepage flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-lg animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Exit button */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={handleExit}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-600/90 hover:bg-red-500 active:scale-95 text-white transition-all shadow-lg"
        >
          Exit
        </button>
      </div>

      {/* Lock progress bar */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1">
        <p className="text-xs text-purple-200/60">
          {voteLocked} / {voteTotal} locked
        </p>
        <div className="w-32 h-1.5 rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-green-500 transition-all duration-300"
            style={{ width: voteTotal ? `${(voteLocked / voteTotal) * 100}%` : "0%" }}
          />
        </div>
      </div>

      <VotingView
        mode="online"
        players={playerRoles}
        selectedTargetPlayerId={selectedTargetPlayerId}
        voterLabel="Who is the imposter?"
        progressLabel={`${voteLocked} / ${voteTotal} players locked in`}
        canSubmit={Boolean(selectedTargetPlayerId) && !hasLocked}
        canChangeVote={!hasLocked}
        submitLabel={hasLocked ? "Vote Locked" : "Lock Vote"}
        onSelectTarget={handleSelectTarget}
        onClearSelection={() => {
          if (!hasLocked) setSelectedTargetPlayerId(null);
        }}
        onSubmitVote={handleLockVote}
        onNextStep={isHost && allLocked ? sendRevealResults : undefined}
        nextStepLabel={isHost && allLocked ? "Reveal Results" : undefined}
        waitingMessage={!isHost && allLocked ? "Waiting for host to reveal results..." : undefined}
      />
    </div>
  );
}