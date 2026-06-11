"use client";

import { useEffect, useRef, useState } from "react";
import {
  GameCreationResponse,
  GameState,
} from "@/lib/gameSettings";
import { useGameStore } from "@/lib/store";
import { getOrCreateClientId } from "@/lib/clientId";

interface Props {
  onComplete: () => void;
  onCancel: () => void;
  initialGame?: GameState;
}

export default function RevealView({ onComplete, onCancel, initialGame }: Props) {
  const settings = useGameStore((state) => state.settings);
  const setGameStore = useGameStore((state) => state.setGame);

  const [game, setGame] = useState<GameState | null>(initialGame || null);
  const [loading, setLoading] = useState(!initialGame);
  const [slowLoading, setSlowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [hasHeld, setHasHeld] = useState(false);
  const [revealedWord, setRevealedWord] = useState<string | null>(null);
  const [revealedRole, setRevealedRole] = useState<string | null>(null);
  const createdRef = useRef(false);

  const TIMEOUT_MS = 8000;

  // ⏱ Show "taking longer" after 10s
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setSlowLoading(true), 10000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (game) return;
    if (!settings) {
      alert("No game settings found. Redirecting back to setup.");
      onCancel();
      return;
    }
    if (createdRef.current) return;
    createdRef.current = true;

    async function createGame() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const clientId = getOrCreateClientId();

      try {
        const res = await fetch(process.env.NEXT_PUBLIC_WEB_TEST_URL!, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...settings, clientId }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const data = (await res.json()) as GameCreationResponse;

        if (!res.ok || !data.ok || !data.game) {
          throw new Error(data.error || "Failed to create game");
        }

        setGame(data.game);
        setGameStore(data.game);
      } catch (err: unknown) {
        console.error(err);

        if (err instanceof Error && err.name === "AbortError") {
          setError("This is taking too long. Check your connection and try again.");
        } else {
          setError(err instanceof Error && err.message ? err.message : "Failed to create game. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }

    createGame();
  }, [settings, game, onCancel, setGameStore]);

  if (!settings) return null;

  // Error UI
  if (error) {
    return (
      <div className="font-homepage flex items-center justify-center min-h-screen bg-black p-4">
        <div className="bg-gray-900 border border-red-500/40 rounded-2xl p-6 text-center text-white max-w-sm w-full shadow-xl space-y-4">
          <div className="text-lg font-semibold text-red-400">
            Something went wrong
          </div>

          <div className="text-sm opacity-80">{error}</div>

          <button
            onClick={onCancel}
            className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 active:scale-95 transition-all font-medium"
          >
            Back to Settings
          </button>
        </div>
      </div>
    );
  }

  // Loading UI
  if (loading) {
    return (
      <div className="font-homepage flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center space-y-3">
          <div className="text-lg sm:text-xl animate-pulse">
            Creating game...
          </div>

          {slowLoading && (
            <div className="text-sm opacity-70">
              This is taking longer than usual...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!game) return null;

  const player = game.players[currentPlayer];
  const lastPlayer = currentPlayer === game.players.length - 1;

  const handlePressStart = () => {
    setIsHolding(true);
    if (!hasHeld) {
      setHasHeld(true);
      setRevealedRole(player.role ?? "");
      setRevealedWord(player.word ?? "");
    }
  };

  const handlePressEnd = () => setIsHolding(false);

  const handleNext = () => {
    setIsHolding(false);
    setHasHeld(false);
    setRevealedRole(null);
    setRevealedWord(null);

    if (!lastPlayer) {
      setCurrentPlayer((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="font-homepage relative flex flex-col items-center justify-center min-h-screen bg-black p-4 text-center text-white space-y-6">
      
      {/* Exit Button */}
      <div className="absolute top-4 left-4">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-600/90 hover:bg-red-500 active:scale-95 text-white transition-all shadow-lg"
        >
          Exit
        </button>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold">{player.name}</h1>

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

      {/* Button */}
      <div className="flex flex-col items-center gap-3 mt-8">
        <button
          disabled={!hasHeld}
          onClick={handleNext}
          className={`w-48 sm:w-64 px-4 py-3 rounded-xl text-base sm:text-lg font-semibold transition-colors
            ${
              hasHeld
                ? "bg-green-600 hover:bg-green-500 text-white"
                : "bg-gray-500 text-gray-300 cursor-not-allowed"
            }`}
        >
          {lastPlayer ? "START GAME" : "NEXT PLAYER"}
        </button>
      </div>
    </div>
  );
}
