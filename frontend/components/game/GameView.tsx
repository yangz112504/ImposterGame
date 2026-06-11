"use client";

import { useEffect, useState, useRef } from "react";
import { useGameStore } from "@/lib/store";

interface GameViewProps {
  onTimeUp: () => void;
  onSkip: () => void;
  onExit: () => void;
  isOnline?: boolean;
}

export default function GamePage({ onTimeUp, onSkip, onExit, isOnline }: GameViewProps) {
  const game = useGameStore((state) => state.game);
  const settings = useGameStore((state) => state.settings);

  const initialTime = settings?.infiniteTimer
    ? null
    : (settings?.timerSeconds ?? null);

  const [timeLeft, setTimeLeft] = useState<number | null>(initialTime);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleBack = () => {
    const shouldLeave = window.confirm(
      "Go back to settings? This will delete the current game and discard the reveal flow."
    );

    if (!shouldLeave) return;

    onExit();
  };

  useEffect(() => {
    if (!game || !settings) { onExit(); return; }
    if (timeLeft === null || paused) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timerRef.current!);
          onTimeUp();
          return 0;
        }
        return prev !== null ? prev - 1 : prev;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, timeLeft, game, settings, onTimeUp, onExit]);

  if (!game || !settings)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white/40 text-xs tracking-widest uppercase animate-pulse">Loading…</p>
      </div>
    );

  const startingPlayerName =
    game.players[game.startingPlayer]?.name ?? game.players[0]?.name ?? "Unknown";

  return (
    <div className="font-homepage relative flex flex-col items-center justify-center min-h-screen p-6 text-white overflow-hidden">
      <button
        onClick={handleBack}
        aria-label="Back to settings"
        className="
          absolute top-4 left-4 z-10
          inline-flex items-center justify-center
          rounded-full border border-white/20 bg-white/10
          px-4 py-2 text-sm font-semibold text-white
          shadow-[0_8px_24px_rgba(0,0,0,0.35)]
          backdrop-blur-xl
          transition-all duration-150
          hover:bg-white/15 hover:-translate-y-0.5
          active:scale-95
        "
      >
        ← Back
      </button>

      {/* Timer card */}
      <div
        className={`
          w-full max-w-xs rounded-[28px] p-8 mb-9
          flex flex-col items-center gap-1
          bg-white/[0.06] border border-white/[0.13]
          backdrop-blur-2xl
          shadow-[0_8px_40px_rgba(0,0,0,0.4),inset_0_0_0_1px_rgba(216,180,254,0.07)]
          transition-opacity duration-500
          ${paused ? "opacity-60" : "opacity-100"}
        `}
      >
        <p className="text-[0.68rem] font-semibold tracking-[0.18em] uppercase text-purple-200/60 mb-1">
          Time Remaining
        </p>

        <span
          className="text-[5.5rem] font-extrabold leading-none tracking-tight text-white"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {timeLeft !== null ? formatTime(timeLeft) : "∞"}
        </span>

        {paused && (
          <span className="mt-2 text-[0.65rem] font-semibold tracking-[0.14em] uppercase text-amber-300 bg-amber-300/10 border border-amber-300/25 rounded-full px-3 py-1">
            Paused
          </span>
        )}
      </div>

      {/* Player line */}
      <p className="text-[1.05rem] font-semibold text-white/85 text-center mb-9">
        <span className="text-violet-200 border-b border-violet-300/40 pb-px">
          {startingPlayerName}
        </span>{" "}
        starts first
      </p>

      {/* Buttons */}
      <div className="flex flex-col w-full max-w-xs gap-3">

        {/* Skip — pure white, dark text, impossible to miss */}
        <button
          onClick={onSkip}
          className="
            w-full py-[0.95rem] rounded-2xl text-sm font-bold tracking-wide
            bg-white text-purple-950
            shadow-[0_4px_20px_rgba(0,0,0,0.5)]
            hover:brightness-95 hover:-translate-y-0.5
            hover:shadow-[0_8px_28px_rgba(0,0,0,0.55)]
            active:scale-[0.97]
            transition-all duration-150
          "
        >
          {timeLeft === null ? "Vote now" : "Skip to Vote"}
        </button>

        {/* Pause / Resume — white border + tinted glass */}
        {timeLeft !== null && !isOnline && (
          <button
            onClick={() => setPaused((p) => !p)}
            className={`
              w-full py-[0.95rem] rounded-2xl text-sm font-bold tracking-wide
              border-2
              shadow-[0_4px_20px_rgba(0,0,0,0.35)]
              hover:-translate-y-0.5 active:scale-[0.97]
              transition-all duration-150
              ${paused
                ? "bg-emerald-400/18 text-emerald-200 border-emerald-400/60 hover:bg-emerald-400/26"
                : "bg-white/15 text-white border-white/55 hover:bg-white/22"
              }
            `}
          >
            {paused ? "Resume Timer" : "Pause Timer"}
          </button>
        )}
      </div>
    </div>
  );
}
