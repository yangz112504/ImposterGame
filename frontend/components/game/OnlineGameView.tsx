"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnlineLobbyStore } from "@/lib/onlineLobbyStore";

interface Props {
  onSkip: () => void;
  onCancel: () => void;
}

export default function OnlineGameView({ onSkip, onCancel }: Props) {
  const role = useOnlineLobbyStore((s) => s.role);
  const word = useOnlineLobbyStore((s) => s.word);
  const isHost = useOnlineLobbyStore((s) => s.isHost);
  const startingPlayer = useOnlineLobbyStore((s) => s.startingPlayer);
  const timerSeconds = useOnlineLobbyStore((s) => s.timerSeconds);
  const leaveGame = useOnlineLobbyStore((s) => s.leaveGame);
  const phase = useOnlineLobbyStore((s) => s.phase);
  const sendSkipToVoting = useOnlineLobbyStore((s) => s.sendSkipToVoting);

  const [timeLeft, setTimeLeft] = useState<number | null>(timerSeconds);
  const [paused, setPaused] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const infiniteTimer = timerSeconds === null; // This is so that if timerSeconds is null (which means infinite timer), we can handle that case separately in the UI and logic without relying on timeLeft which is used for the countdown when there's a finite timer.

  const onSkipRef = useRef(onSkip);
  useEffect(() => { onSkipRef.current = onSkip; }, [onSkip]);

    useEffect(() => {
        if (!isHost) return;
        if (paused) return;

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
            if (prev === null) return prev;
            if (prev <= 1) {
                clearInterval(timerRef.current!);
                onSkipRef.current();
                return 0;
            }
            return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [paused, isHost]);

  // Navigate when phase changes to voting
  const prevPhase = useRef(phase);

  useEffect(() => {
    if (prevPhase.current === "discussion" && phase === "voting") {
      onSkip();
    }
    prevPhase.current = phase;
  }, [phase, onSkip]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleExit = () => {
    leaveGame();
    onCancel();
  };

  if (!role || timerSeconds === undefined) {
    return (
        <div className="font-homepage flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-lg animate-pulse">Loading...</div>
        </div>
    );
    }

  return (
    <div className="font-homepage relative flex flex-col items-center justify-center min-h-screen p-6 text-white overflow-hidden">

      {/* Exit */}
      <div className="absolute top-4 left-4">
        <button
          onClick={handleExit}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-600/90 hover:bg-red-500 active:scale-95 text-white transition-all shadow-lg"
        >
          Exit
        </button>
      </div>

      {/* Timer card — everyone sees the time, only host sees live countdown */}
      <div
        className={`
          w-full max-w-xs rounded-[28px] p-8 mb-9
          flex flex-col items-center gap-1
          bg-white/[0.06] border border-white/[0.13]
          backdrop-blur-2xl
          shadow-[0_8px_40px_rgba(0,0,0,0.4)]
          transition-opacity duration-500
          ${paused ? "opacity-60" : "opacity-100"}
        `}
      >
        <p className="text-[0.68rem] font-semibold tracking-[0.18em] uppercase text-purple-200/60 mb-1">
          {isHost ? "Time Remaining" : "Discussion Time"}
        </p>

        <span
          className="text-[5.5rem] font-extrabold leading-none tracking-tight text-white"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {isHost
            ? infiniteTimer ? "∞" : timeLeft !== null ? formatTime(timeLeft) : "∞"
            : infiniteTimer ? "∞" : formatTime(timerSeconds!)
            }
        </span>

        {isHost && paused && (
          <span className="mt-2 text-[0.65rem] font-semibold tracking-[0.14em] uppercase text-amber-300 bg-amber-300/10 border border-amber-300/25 rounded-full px-3 py-1">
            Paused
          </span>
        )}

        {!isHost && (
          <p className="mt-2 text-xs text-purple-200/50">
            Host controls the timer
          </p>
        )}
      </div>

      {/* Starting player */}
      <p className="text-[1.05rem] font-semibold text-white/85 text-center mb-6">
        <span className="text-violet-200 border-b border-violet-300/40 pb-px">
          {startingPlayer ?? "Unknown"}
        </span>{" "}
        starts first
      </p>

      {/* Peek at word */}
      <div
        className={`w-full max-w-xs rounded-2xl p-4 mb-9 text-center cursor-pointer select-none transition-all duration-200
          ${isRevealing
            ? role === "imposter"
              ? "bg-red-700 scale-95"
              : "bg-purple-500 scale-95"
            : "bg-white/10 border border-white/20"
          }`}
        onPointerDown={() => setIsRevealing(true)}
        onPointerUp={() => setIsRevealing(false)}
        onPointerLeave={() => setIsRevealing(false)}
        onTouchStart={() => setIsRevealing(true)}
        onTouchEnd={() => setIsRevealing(false)}
      >
        {isRevealing ? (
          <p className="text-lg font-extrabold tracking-wide">
            {role === "imposter" ? "IMPOSTER" : word?.toUpperCase()}
          </p>
        ) : (
          <p className="text-sm text-white/60">Hold to peek at your role</p>
        )}
      </div>

      {/* Host controls */}
      <div className="flex flex-col w-full max-w-xs gap-3">
        {isHost && (
          <>
            <button
              onClick={() => sendSkipToVoting()}
              className="
                w-full py-[0.95rem] rounded-2xl text-sm font-bold tracking-wide
                bg-white text-purple-950
                shadow-[0_4px_20px_rgba(0,0,0,0.5)]
                hover:brightness-95 hover:-translate-y-0.5
                active:scale-[0.97]
                transition-all duration-150
              "
            >
                {infiniteTimer ? "Vote now" : "Skip to Vote"}
            </button>

            {!infiniteTimer && (
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
          </>
        )}
      </div>
    </div>
  );
}