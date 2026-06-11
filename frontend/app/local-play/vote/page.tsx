"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import VotingView from "@/components/game/VotingView";
import { useGameStore } from "@/lib/store";
import { ShieldCheck } from "lucide-react";

export default function LocalVotePage() {
  const router = useRouter();
  const game = useGameStore((state) => state.game);
  const setGame = useGameStore((state) => state.setGame);

  const [currentVoterIndex, setCurrentVoterIndex] = useState(0);
  const [selectedTargetPlayerId, setSelectedTargetPlayerId] = useState<string | null>(null);
  const [isBallotVisible, setIsBallotVisible] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [isResultsTransitioning, setIsResultsTransitioning] = useState(false);
  const startedVotingRef = useRef(false);
  const resultsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiBase = new URL(process.env.NEXT_PUBLIC_WEB_TEST_URL!).origin;

  useEffect(() => {
    return () => {
      if (resultsTimerRef.current) {
        clearTimeout(resultsTimerRef.current);
        resultsTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!game) {
      router.replace("/local-play");
      return;
    }

    if (game.phase === "results") {
      if (isResultsTransitioning) {
        return;
      }
      router.replace("/local-play/results");
      return;
    }

    if (game.phase === "voting") {
      return;
    }

    if (startedVotingRef.current) {
      return;
    }
    startedVotingRef.current = true;

    async function startVoting() {
      try {
        const res = await fetch(`${apiBase}/games/${game?.gameId}/start-voting`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          throw new Error("Failed to start voting");
        }

        const data = await res.json();
        setGame(data);
      } catch (error) {
        console.error(error);
        startedVotingRef.current = false;
      }
    }

    startVoting();
  }, [apiBase, game, router, setGame, isResultsTransitioning]);

  const currentGame = useGameStore((state) => state.game);

  if (!currentGame) return null;

  if (isResultsTransitioning) {
    return (
      <div className="flex min-h-svh items-center justify-center px-6 text-center text-white">
        <div className="space-y-4">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-purple-200/50">
            And now for the moment of truth...
          </div>
          <div className="flex items-center justify-center gap-1 text-2xl font-extrabold sm:text-3xl">
            Loading results
            <span className="flex items-end gap-[3px] pb-0.5 ml-1">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </span>
          </div>
          <div className="text-sm text-white/45">
            Please wait a moment while the votes are counted.
          </div>
        </div>

        <style>{`
          .dot {
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: currentColor;
            animation: bounce 1.2s ease-in-out infinite;
          }
          .dot:nth-child(1) { animation-delay: 0s; }
          .dot:nth-child(2) { animation-delay: 0.2s; }
          .dot:nth-child(3) { animation-delay: 0.4s; }

          @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
            30% { transform: translateY(-5px); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  const activeVoter = currentGame.players[currentVoterIndex];
  const totalVoters = currentGame.players.length;
  const isLastVoter = currentVoterIndex === totalVoters - 1;

  const handleOpenBallot = () => {
    setSelectedTargetPlayerId(null);
    setIsBallotVisible(true);
  };

  const handleSubmitVote = async () => {
    if (!selectedTargetPlayerId || !activeVoter || isSubmittingVote) return;

    setIsSubmittingVote(true);

    try {
      const voteRes = await fetch(`${apiBase}/games/${currentGame.gameId}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voterId: activeVoter.id,
          targetPlayerId: selectedTargetPlayerId,
        }),
      });

      if (!voteRes.ok) {
        throw new Error("Failed to submit vote");
      }

      const votedGame = await voteRes.json();
      setGame(votedGame);
      setIsBallotVisible(false);
      setSelectedTargetPlayerId(null);

      if (isLastVoter) {
        const finishRes = await fetch(`${apiBase}/games/${currentGame.gameId}/finish-voting`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!finishRes.ok) {
          throw new Error("Failed to finish voting");
        }

        const finishedGame = await finishRes.json();
        setGame(finishedGame);
        setIsResultsTransitioning(true);

        if (resultsTimerRef.current) {
          clearTimeout(resultsTimerRef.current);
        }

        resultsTimerRef.current = setTimeout(() => {
          resultsTimerRef.current = null;
          router.push("/local-play/results");
        }, 2000);
        return;
      }

      setCurrentVoterIndex((prev) => prev + 1);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingVote(false);
    }
  };

  if (!activeVoter) return null;

  const otherPlayers = currentGame.players.filter((player) => player.id !== activeVoter.id);

  // Replace the outer div and card wrapper:

  return (
    <div className="min-h-screen text-white">
      {!isBallotVisible ? (
        <>
        {/* ── Mobile: full-screen column ── */}
        <div className="flex h-svh flex-col justify-between px-6 pb-10 pt-safe md:hidden">
          {/* Top */}
          <div className="flex flex-col items-center pt-14 text-center">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-purple-200/50">
              Pass the Phone
            </p>
            <h1 className="mt-3 font-['Sora'] text-5xl font-extrabold">{activeVoter.name}</h1>
            <p className="mt-2 text-sm text-white/35">Player {currentVoterIndex + 1} of {totalVoters}</p>
          </div>

          {/* Middle */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <ShieldCheck className="h-7 w-7 text-purple-300/50" />
            </div>
            <p className="text-sm leading-relaxed text-white/35">
              Make sure nobody else<br />can see your vote.
            </p>
          </div>

          {/* Bottom CTA */}
          <div>
            <button
              type="button"
              onClick={handleOpenBallot}
              className="w-full rounded-2xl bg-white py-5 text-base font-extrabold text-purple-950 transition active:scale-95"
            >
              I&apos;m Ready to Vote
            </button>
            <p className="mt-3 text-center text-xs text-white/20">
              Vote {currentVoterIndex + 1} of {totalVoters}
            </p>
          </div>
        </div>

        {/* ── Desktop: centered card ── */}
        <div className="hidden min-h-screen md:flex md:items-center md:justify-center md:p-8">
          <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.07] p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-purple-200/50">
              Pass the Phone
            </p>
            <h1 className="mt-3 font-['Sora'] text-5xl font-extrabold">{activeVoter.name}</h1>
            <p className="mt-2 text-sm text-white/35">Player {currentVoterIndex + 1} of {totalVoters}</p>

            <div className="my-8 border-t border-white/[0.06]" />

            <div className="mb-6 flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <ShieldCheck className="h-7 w-7 text-purple-300/50" />
              </div>
              <p className="text-sm leading-relaxed text-white/35">
                Make sure nobody else can see your vote.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenBallot}
              className="w-full rounded-2xl bg-white py-4 text-base font-extrabold text-purple-950 transition hover:-translate-y-0.5 active:scale-95"
            >
              I&apos;m Ready to Vote
            </button>
            <p className="mt-3 text-xs text-white/20">
              Vote {currentVoterIndex + 1} of {totalVoters}
            </p>
          </div>
        </div>
        </>
      ) : (
        <VotingView
          mode="local"
          players={otherPlayers}
          selectedTargetPlayerId={selectedTargetPlayerId}
          voterLabel={`${activeVoter.name}, who is the imposter?`}
          progressLabel={`Vote ${currentVoterIndex + 1} of ${totalVoters}`}
          canSubmit={Boolean(selectedTargetPlayerId) && !isSubmittingVote}
          canChangeVote={true}
          submitLabel={isLastVoter ? "See Results" : "Lock Vote"}
          onSelectTarget={setSelectedTargetPlayerId}
          onClearSelection={() => setSelectedTargetPlayerId(null)}
          onSubmitVote={handleSubmitVote}
        />
      )}
    </div>
  );
}
