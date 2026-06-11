"use client";

import { useState, useEffect } from "react";
import { PlayerRole } from "@/lib/gameSettings";


type VotingViewProps = {
  mode: "local" | "online";
  players: PlayerRole[];
  selectedTargetPlayerId: string | null;
  voterLabel: string;
  progressLabel: string;
  canSubmit: boolean;
  canChangeVote: boolean;
  onSelectTarget: (playerId: string) => void;
  onClearSelection: () => void;
  onSubmitVote: () => void;
  submitLabel?: string;
  onNextStep?: () => void;
  nextStepLabel?: string;
  onEndVoting?: () => void;
  waitingMessage?: string;
};

export default function VotingView({
  players,
  selectedTargetPlayerId,
  voterLabel,
  progressLabel,
  canSubmit,
  canChangeVote,
  onSelectTarget,
  onClearSelection,
  onSubmitVote,
  submitLabel = "Lock Vote",
  onNextStep,
  nextStepLabel,
  onEndVoting,
  waitingMessage,
}: VotingViewProps) {
  // Local preview: which player is "hovered/selected" before locking
  const [previewId, setPreviewId] = useState<string | null>(selectedTargetPlayerId);

  // Sync if parent clears selection (e.g. after vote submitted)
  useEffect(() => {
    setPreviewId(selectedTargetPlayerId);
  }, [selectedTargetPlayerId]);

  const handlePlus = (playerId: string) => {
    if (!canChangeVote) return;
    if (previewId === playerId) return; // already selected
    setPreviewId(playerId);
    onSelectTarget(playerId);
  };

  const handleMinus = (playerId: string) => {
    if (!canChangeVote) return;
    if (previewId !== playerId) return;
    setPreviewId(null);
    onClearSelection();
  };

  return (
    // ── outer shell: full-screen on mobile, centered on desktop ──────────────
    <div className="
      font-homepage
      flex min-h-svh w-full flex-col
      md:min-h-screen md:items-center md:justify-center md:p-8
    ">
      {/* ── card wrapper (desktop only) ───────────────────────────────────── */}
      <div className="
        flex w-full flex-1 flex-col
        md:flex-initial md:w-full md:max-w-lg md:rounded-[28px]
        md:border md:border-white/10 md:bg-white/[0.06]
        md:p-8 md:backdrop-blur-2xl
        md:shadow-[0_20px_60px_rgba(0,0,0,0.5)]
      ">

        {/* Header */}
        <div className="
          flex-none px-5 pb-4 pt-10 text-center
          md:px-0 md:pt-0
        ">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-purple-200/50">
            Voting
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-white leading-tight">
            {voterLabel}
          </h1>
          <p className="mt-1.5 text-sm text-white/40">{progressLabel}</p>
        </div>

        {/* Player list — scrollable on mobile if many players */}
        <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4 md:px-0">
          {players.map((player) => {
            const isPreview = previewId === player.id;

            return (
              <div
                key={player.id}
                className={`
                  relative w-full overflow-hidden rounded-[20px] border
                  transition-all duration-500
                  ${isPreview
                    ? "border-red-400/40 bg-red-500/20 shadow-[0_6px_24px_rgba(239,68,68,0.15)]"
                    : "border-white/10 bg-white/[0.06]"
                  }
                `}
              >
                <div className="relative flex items-center justify-between gap-3 px-4 py-3.5">
                  {/* Name + status */}
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold text-white leading-tight truncate">
                      {player.name}
                    </p>
                    <p className={`
                      text-[0.68rem] uppercase tracking-[0.15em] transition-colors duration-300
                      ${isPreview ? "text-red-300/70" : "text-white/40"}
                    `}>
                      {isPreview ? "Your suspect" : "Tap to accuse"}
                    </p>
                  </div>

                  {/* Controls + count */}
                  <div className="flex items-center gap-2 flex-none">
                    {/* Minus */}
                    <button
                      type="button"
                      aria-label={`Remove vote from ${player.name}`}
                      onClick={() => handleMinus(player.id)}
                      disabled={!isPreview || !canChangeVote}
                      className={`
                        flex h-9 w-9 items-center justify-center rounded-full
                        text-lg font-bold transition-all duration-200
                        ${isPreview && canChangeVote
                          ? "bg-red-400/20 text-red-200 hover:bg-red-400/35 active:scale-90"
                          : "bg-white/5 text-white/20 cursor-not-allowed"
                        }
                      `}
                    >
                      −
                    </button>
                    {/* Plus */}
                    <button
                      type="button"
                      aria-label={`Vote for ${player.name}`}
                      onClick={() => handlePlus(player.id)}
                      disabled={isPreview || !canChangeVote}
                      className={`
                        flex h-9 w-9 items-center justify-center rounded-full
                        text-lg font-bold transition-all duration-200
                        ${!isPreview && canChangeVote
                          ? "bg-white/10 text-white hover:bg-white/20 active:scale-90"
                          : "bg-white/5 text-white/20 cursor-not-allowed"
                        }
                      `}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex-none space-y-2.5 px-5 pb-10 pt-3 md:px-0 md:pb-0 md:pt-4">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmitVote}
            className={`
              w-full rounded-2xl px-4 py-4 text-base font-extrabold
              transition-all duration-200
              ${canSubmit
                ? "bg-white text-purple-950 shadow-[0_8px_28px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 active:scale-95"
                : "bg-white/10 text-white/30 cursor-not-allowed"
              }
            `}
          >
            {submitLabel}
          </button>

          {selectedTargetPlayerId && canChangeVote && (
            <button
              type="button"
              onClick={() => {
                setPreviewId(null);
                onClearSelection();
              }}
              className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/10 active:scale-95"
            >
              Clear Selection
            </button>
          )}

          {onNextStep && nextStepLabel && (
            <button
              type="button"
              onClick={onNextStep}
              className="w-full rounded-2xl border border-emerald-300/50 bg-emerald-400/25 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400/35 active:scale-95"
            >
              {nextStepLabel}
            </button>
          )}

          {waitingMessage && (
            <div className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 mt-3 text-center text-sm font-semibold text-white/40">
              {waitingMessage}
            </div>
          )}

          {onEndVoting && (
            <button
              type="button"
              onClick={onEndVoting}
              className="w-full rounded-2xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200/80 transition hover:bg-red-400/16 active:scale-95"
            >
              End Voting
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
