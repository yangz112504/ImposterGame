"use client";

import { useEffect, useRef, useState } from "react";
import { useOnlineLobbyStore } from "@/lib/onlineLobbyStore";
import { useRouter } from "next/navigation";

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

export default function OnlineRevealView({ onComplete, onCancel }: Props) {
  const router = useRouter();

  // all store reads together
  const role = useOnlineLobbyStore((s) => s.role);
  const word = useOnlineLobbyStore((s) => s.word);
  const readinessReady = useOnlineLobbyStore((s) => s.readinessReady);
  const readinessTotal = useOnlineLobbyStore((s) => s.readinessTotal);
  const phase = useOnlineLobbyStore((s) => s.phase);
  const sendRevealReady = useOnlineLobbyStore((s) => s.sendRevealReady);
  const leaveGame = useOnlineLobbyStore((s) => s.leaveGame);

  // all useState together
  const [isHolding, setIsHolding] = useState(false);
  const [hasHeld, setHasHeld] = useState(false);
  const [hasReadied, setHasReadied] = useState(false);
  const [revealedWord, setRevealedWord] = useState<string | null>(null);
  const [revealedRole, setRevealedRole] = useState<string | null>(null);

  // all refs together
  const prevPhase = useRef(phase);

  // all useEffect together
  useEffect(() => {
    if (prevPhase.current === "reveal" && phase === "discussion") {
      onComplete();
    }
    prevPhase.current = phase;
  }, [phase, onComplete]);

  // early return after all hooks
  if (!role) return null;

  const handlePressStart = () => {
    setIsHolding(true);
    if (!hasHeld) {
      setHasHeld(true);
      setRevealedRole(role);
      setRevealedWord(word ?? null);
    }
  };

  const handlePressEnd = () => setIsHolding(false);

  const handleReady = () => {
    setIsHolding(false);
    setHasReadied(true);
    sendRevealReady();
  };

  const handleExit = () => {
    leaveGame();
    onCancel();
  };

  return (
    <div className="font-homepage relative flex flex-col items-center justify-center min-h-screen bg-black p-4 text-center text-white space-y-6">

      {/* Exit Button */}
      <div className="absolute top-4 left-4">
        <button
          onClick={handleExit}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-600/90 hover:bg-red-500 active:scale-95 text-white transition-all shadow-lg"
        >
          Exit
        </button>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold">Your Role</h1>

      {/* Card */}
      <div
        className={`w-[85vw] max-w-md h-[40vh] max-h-[320px] rounded-2xl shadow-2xl flex flex-col justify-center items-center 
        text-xl sm:text-3xl font-bold transition-all duration-200 no-select
        ${
          isHolding
            ? revealedRole === "imposter"
              ? "bg-red-700 scale-95 shadow-red-500/40"
              : "bg-purple-500 scale-95 shadow-purple-400/40"
            : "bg-purple-700 hover:bg-purple-600"
        }`}
        onPointerDown={handlePressStart}
        onPointerUp={handlePressEnd}
        onPointerLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
      >
        {isHolding ? (
          <div className="flex flex-col items-center justify-center text-center px-4 space-y-4">
            <div className="text-4xl sm:text-5xl font-extrabold tracking-wide">
              {revealedRole === "imposter"
                ? "IMPOSTER"
                : revealedWord?.toUpperCase()}
            </div>
            <div className="text-sm sm:text-base opacity-80 font-normal">
              {revealedRole === "imposter"
                ? "You are the imposter! Try to blend in."
                : "Remember your word!"}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="text-xl sm:text-2xl">HOLD TO REVEAL</div>
            <div className="text-sm opacity-70">
              Make sure nobody else sees!
            </div>
          </div>
        )}
      </div>

      {/* Button + Readiness Bar */}
      <div className="flex flex-col items-center gap-3 mt-8">
        <button
          disabled={!hasHeld || hasReadied}
          onClick={handleReady}
          className={`w-48 sm:w-64 px-4 py-3 rounded-xl text-base sm:text-lg font-semibold transition-colors
            ${
              hasHeld && !hasReadied
                ? "bg-green-600 hover:bg-green-500 text-white"
                : "bg-gray-500 text-gray-300 cursor-not-allowed"
            }`}
        >
          {hasReadied ? "Waiting..." : "Ready to Start"}
        </button>

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-purple-200/70">
            {readinessReady} / {readinessTotal} ready
          </p>
          <div className="w-48 sm:w-64 h-2 rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-green-500 transition-all duration-300"
              style={{
                width: readinessTotal
                  ? `${(readinessReady / readinessTotal) * 100}%`
                  : "0%",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}