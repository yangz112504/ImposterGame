"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CategoryCard } from "@/components/CategoryCard";
import { RulesCard } from "@/components/RulesCard";
import { generateCustomWord } from "@/lib/customWord";
import { getOrCreateClientId } from "@/lib/clientId";
import { useOnlineLobbyStore } from "@/lib/onlineLobbyStore";
import {
  defaultGameSettings,
  GameSettings,
} from "@/lib/gameSettings";

export default function LobbyPage() {
  const router = useRouter();
  const roomCode = useOnlineLobbyStore((state) => state.roomCode);
  const players = useOnlineLobbyStore((state) => state.players);
  const isHost = useOnlineLobbyStore((state) => state.isHost);
  const settings = useOnlineLobbyStore((state) => state.settings);
  const gameStarted = useOnlineLobbyStore((state) => state.gameStarted);
  const error = useOnlineLobbyStore((state) => state.error);
  const clearError = useOnlineLobbyStore((state) => state.clearError);
  const updateSettings = useOnlineLobbyStore((state) => state.updateSettings);
  const startGame = useOnlineLobbyStore((state) => state.startGame);
  const leaveLobby = useOnlineLobbyStore((state) => state.leaveLobby);
  const connectionStatus = useOnlineLobbyStore((state) => state.connectionStatus);

  const [isStarting, setIsStarting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [draftSettings, setDraftSettings] = useState<GameSettings>(settings ?? defaultGameSettings);
  const [openSections, setOpenSections] = useState({
    rules: false,
    category: true,
  });
  const [savedSettings, setSavedSettings] = useState(false);


  const cleanupArmedRef = useRef(false); // This makes sure we only call leaveLobby on unmount if the component has fully mounted, to avoid issues with React's strict mode in development which mounts, unmounts, and remounts components.
  const leavingLobbyRef = useRef(false);
  const gameStartedRef = useRef(gameStarted);  // This ref is used to track the gameStarted state in the cleanup function of the useEffect that handles leaving the lobby, to ensure that we don't call leaveLobby if the game has already started, which could cause issues if a player tries to leave after the game has begun.

  useEffect(() => {
    gameStartedRef.current = gameStarted;
  }, [gameStarted]);


  const params = useParams();
  const routeRoom = (params.room as string).toUpperCase();
  const activeCode = roomCode || routeRoom;
  const canStartGame = isHost && players.length >= 3 && !gameStarted;
  const canEditSettings = isHost && !gameStarted && connectionStatus === "connected";

  // This initializes the lobby when the component mounts
  useEffect(() => {
    if (settings) {
      setDraftSettings(settings);
    }
  }, [settings]);


  const phase = useOnlineLobbyStore((state) => state.phase);

  // Redirect to the appropriate page based on the current phase of the game. This ensures that if a player refreshes the page or joins an already started game, they will be taken to the correct view (reveal or discussion) instead of getting stuck in the lobby.
  useEffect(() => {
    if (phase === "reveal") {
      router.push(`/online-play/${activeCode}/reveal`);
    }
  }, [phase, activeCode, router]);

  // This effect handles redirecting the user back to the online play page if they are not the host and the connection status is idle, which likely means they have been disconnected from the lobby. This prevents non-host players from getting stuck on a lobby page that is no longer active.
  useEffect(() => {
    console.log("redirect effect", {
      isHost,
      connectionStatus,
    });

    if (!isHost && connectionStatus === "idle") {
      console.log("REDIRECTING");
      router.push("/online-play");
    }
  }, [connectionStatus, isHost, router]);
 
  // This effect handles leaving the lobby when the user navigates away or closes the tab. It uses a ref to track whether the user has already left the lobby to avoid duplicate calls. The cleanup function is also careful to only call leaveLobby if the cleanup was armed (to avoid calling it during React's strict mode double-invoke in development) and if the user hasn't already left.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!leavingLobbyRef.current) {
        leaveLobby();
      }
    };

    const cleanupTimer = window.setTimeout(() => {
      cleanupArmedRef.current = true;
    }, 0);

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.clearTimeout(cleanupTimer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (cleanupArmedRef.current && !leavingLobbyRef.current && !gameStartedRef.current) {
        leaveLobby();
      }
    };
  }, [leaveLobby]);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(activeCode);
      setIsCopying(true);
      window.setTimeout(() => setIsCopying(false), 1500);
    } catch (copyError) {
      console.error(copyError);
    }
  }

  async function handleStartGame() {
    clearError();
    setIsStarting(true);
    try {
      await startGame();
    } catch (startError) {
      console.error(startError);
      setIsStarting(false); // only reset on error
    }
  }

  // This function handles leaving the lobby when the user clicks the "Leave" button. It sets the leavingLobbyRef to true to indicate that the user has intentionally left, calls the leaveLobby function from the store, and then redirects the user back to the main online play page.
  function handleLeaveLobby() {
    leavingLobbyRef.current = true;
    leaveLobby();
    router.push("/online-play");
  }

  const hasCustomWord = draftSettings.category.type !== "custom" || Boolean(draftSettings.category.word);
  const canSaveSettings = canEditSettings && hasCustomWord && !isSavingSettings;

  // Allows host to save settings
  async function handleSaveSettings() {
    if (!canSaveSettings) return;
    clearError();
    setIsSavingSettings(true);

    try {
      await updateSettings(draftSettings);
      setSavedSettings(true);
      window.setTimeout(() => setSavedSettings(false), 1500);
    } catch (saveError) {
      console.error(saveError);
    } finally {
      setIsSavingSettings(false);
    }
  }

  // Generates a custom word
  async function handleGenerateWord() {
    setIsGeneratingWord(true);
    setGenerationMessage(null);
    setGenerationError(null);

    try {
      const result = await generateCustomWord({
        prompt: draftSettings.category.prompt ?? "",
        clientId: getOrCreateClientId(),
      });
      setDraftSettings((prev) => ({
        ...prev,
        category: {
          ...prev.category,
          word: result.word,
        },
      }));
      setGenerationMessage(result.message);
      setGenerationError(null);
    } catch (error: unknown) {
      console.error(error);
      setDraftSettings((prev) => ({
        ...prev,
        category: { ...prev.category, word: undefined },
      }));
      setGenerationMessage(null);
      setGenerationError(
        error instanceof Error && error.message ? error.message : "Failed to generate word."
      );
    } finally {
      setIsGeneratingWord(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handleLeaveLobby}
            className="inline-flex items-center gap-1.5 text-[0.8rem] font-semibold tracking-widest text-purple-200/55 transition-colors duration-150 hover:text-purple-200/90"
          >
            <span className="text-base leading-none">‹</span>
            Leave
          </button>

          <div className="text-right">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-purple-200/55">
              Lobby Code
            </p>
            <p className="font-['Sora'] text-2xl font-extrabold tracking-[0.18em] text-white sm:text-3xl sm:tracking-[0.24em]">
              {activeCode}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[24px] bg-white/10 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-purple-200/55">
                  Active Players
                </p>
                <h1 className="mt-1 font-['Sora'] text-[2rem] font-extrabold leading-none text-white">
                  {gameStarted ? "Game Started" : "Waiting for players"}
                </h1>
              </div>
              <button
                onClick={handleCopyCode}
                className="rounded-full border border-purple-200/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-purple-100 transition-colors duration-150 hover:bg-white/15"
              >
                {isCopying ? "Copied" : "Copy Code"}
              </button>
            </div>

            <div className="space-y-3">
              {players.length > 0 ? (
                players.map((player) => (
                  <div
                    key={player}
                    className="rounded-2xl border border-purple-200/10 bg-black/10 px-4 py-3 font-medium text-purple-50"
                  >
                    {player}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-purple-200/15 bg-black/10 px-4 py-6 text-sm text-purple-100/65">
                  Share the code so friends can join.
                </p>
              )}
            </div>

            {error && (
              <p className="mt-4 text-sm font-medium text-red-200">
                {error}
              </p>
            )}

            {connectionStatus === "idle" && !roomCode && (
              <div className="mt-4 rounded-2xl border border-yellow-300/30 bg-yellow-500/10 px-4 py-3 text-sm font-medium text-yellow-100">
                This lobby is not connected right now. Return to online play and join again.
              </div>
            )}
          </div>

          <div className="space-y-4">
            {isHost && !gameStarted && (
              <div className="space-y-4 rounded-[24px] bg-white/10 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-purple-200/55">
                    Host Settings
                  </p>
                  <p className="mt-2 text-sm text-purple-100/70">
                    Edit settings here. Save when you’re done.
                  </p>
                </div>

                <RulesCard
                  timerSeconds={draftSettings.timerSeconds}
                  infiniteTimer={draftSettings.infiniteTimer}
                  imposterFirst={draftSettings.imposterFirst}
                  secretMode={draftSettings.secretMode}
                  setTimerSeconds={(timerSeconds) =>
                    setDraftSettings((prev) => ({ ...prev, timerSeconds }))
                  }
                  setInfiniteTimer={(infiniteTimer) =>
                    setDraftSettings((prev) => ({ ...prev, infiniteTimer }))
                  }
                  setImposterFirst={(v) => setDraftSettings((prev) => ({ ...prev, imposterFirst: v }))}
                  setSecretMode={(v) => setDraftSettings((prev) => ({ ...prev, secretMode: v }))}
                  isOpen={openSections.rules}
                  onToggle={() => setOpenSections((prev) => ({ ...prev, rules: !prev.rules }))}
                />

                <CategoryCard
                  category={draftSettings.category}
                  setCategory={(category) => {
                    setGenerationMessage(null);
                    setGenerationError(null);
                    setDraftSettings((prev) => ({ ...prev, category }));
                  }}
                  isOpen={openSections.category}
                  onToggle={() => setOpenSections((prev) => ({ ...prev, category: !prev.category }))}
                  onGenerate={handleGenerateWord}
                  isGenerating={isGeneratingWord}
                  generationMessage={generationMessage}
                  generationError={generationError}
                />

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveSettings}
                    disabled={!canSaveSettings}
                    className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold text-white transition-all duration-150 active:enabled:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40
                      ${savedSettings
                        ? "bg-green-600"
                        : "bg-purple-600 hover:enabled:bg-purple-700"
                      }`}
                  >
                    {isSavingSettings ? "Saving..." : savedSettings ? "Saved!" : "Save settings"}
                  </button>
                  <button
                    onClick={() => {
                      setGenerationMessage(null);
                      setGenerationError(null);
                      setDraftSettings(settings ?? defaultGameSettings);
                    }}
                    disabled={!canEditSettings}
                    className="rounded-2xl border border-purple-200/20 bg-white/10 px-4 py-3 text-sm font-semibold text-purple-100 transition-colors duration-150 hover:enabled:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Reset
                  </button>
                </div>

                {!hasCustomWord && (
                  <p className="text-sm text-red-200">
                    Generate a word before saving custom settings.
                  </p>
                )}
              </div>
            )}

            {!isHost && (
              <div className="rounded-[24px] bg-white/10 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-purple-200/55">
                  Lobby Status
                </p>
                <p className="mt-3 text-sm leading-6 text-purple-100/75">
                  You&apos;re in the lobby. Wait for the host to start the game.
                </p>
              </div>
            )}

            {isHost && !gameStarted && (
              <button
                onClick={handleStartGame}
                disabled={!canStartGame || connectionStatus !== "connected" || isStarting}
                className="w-full rounded-2xl bg-purple-600 px-4 py-4 text-lg font-bold text-white transition-all duration-150 hover:enabled:bg-purple-700 active:enabled:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isStarting ? "Starting..." : "Start Game"}
              </button>
            )}

            {isHost && !canStartGame && !gameStarted && (
              <p className="text-center text-sm text-purple-100/70">
                Need at least 3 connected players to start.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
