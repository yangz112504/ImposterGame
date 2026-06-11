"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CategoryCard } from "@/components/CategoryCard";
import { RulesCard } from "@/components/RulesCard";
import { generateCustomWord } from "@/lib/customWord";
import { useOnlineLobbyStore } from "@/lib/onlineLobbyStore";
import { getOrCreateClientId } from "@/lib/clientId";
import {
  defaultGameSettings,
  GameSettings,
} from "@/lib/gameSettings";

export default function CreateLobbyPage() {
  const router = useRouter();
  const createLobby = useOnlineLobbyStore((state) => state.createLobby);
  const lobbyError = useOnlineLobbyStore((state) => state.error);
  const clearError = useOnlineLobbyStore((state) => state.clearError);

  const [hostName, setHostName] = useState("");
  const [settings, setSettings] = useState<GameSettings>({
    ...defaultGameSettings,
    clientId: getOrCreateClientId(),
  });
  const [openSections, setOpenSections] = useState({
    rules: false,
    category: true,
  });
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const needsCustomWord =
    settings.category.type === "custom" && !settings.category.word;
  const canCreateLobby =
    hostName.trim().length > 0 && !isCreatingLobby && (!needsCustomWord || Boolean(settings.category.word));

  useEffect(() => {
    clearError();
  }, [clearError]);

  async function handleGenerateWord() {
    setIsGeneratingWord(true);
    setGenerationMessage(null);
    setGenerationError(null);

    try {
      const result = await generateCustomWord({
        prompt: settings.category.prompt ?? "",
        clientId: getOrCreateClientId(),
      });

      setSettings((prev) => ({
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
      setSettings((prev) => ({
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

  async function handleCreateLobby() {
    if (!canCreateLobby) return;

    setIsCreatingLobby(true);
    clearError();

    try {
      // once the promise returned by createLobby resolves with the new room code, we can transition to the lobby screen. If there's an error during lobby creation, it will throw and be caught in the catch block, allowing us to display the error message in the UI.
      const roomCode = await createLobby(hostName.trim(), {
        ...settings,
        clientId: getOrCreateClientId(),
      });
      router.push(`/online-play/${roomCode}`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreatingLobby(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-md">
        <Link
          href="/online-play"
          className="mb-6 inline-flex items-center gap-1.5 text-[0.8rem] font-semibold tracking-widest text-purple-200/55 transition-colors duration-150 hover:text-purple-200/90"
        >
          <span className="text-base leading-none">‹</span>
          Back
        </Link>

        <div className="mb-6 text-center">
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-purple-200/55">
            Online Play
          </p>
          <h1 className="font-['Sora'] text-[2.3rem] font-extrabold leading-none tracking-tight text-white">
            Create a Lobby
          </h1>
          <p className="mt-2 text-sm font-medium tracking-widest text-purple-200/65">
            Set up the room, then invite friends with the code
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] bg-white/10 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-purple-100/70">
                Host display name
              </span>
              <input
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-2xl border border-purple-200/20 bg-white/10 px-4 py-3 text-white placeholder:text-purple-100/35 focus:border-purple-300 focus:outline-none"
                autoComplete="name"
              />
            </label>
          </div>

          <RulesCard
            timerSeconds={settings.timerSeconds}
            infiniteTimer={settings.infiniteTimer}
            imposterFirst={settings.imposterFirst}
            secretMode={settings.secretMode}
            setTimerSeconds={(timerSeconds) =>
              setSettings((prev) => ({ ...prev, timerSeconds }))
            }
            setInfiniteTimer={(infiniteTimer) =>
              setSettings((prev) => ({ ...prev, infiniteTimer }))
            }
            setImposterFirst={(v) => setSettings((prev) => ({ ...prev, imposterFirst: v }))}
            setSecretMode={(v) => setSettings((prev) => ({ ...prev, secretMode: v }))}
            isOpen={openSections.rules}
            onToggle={() => setOpenSections((prev) => ({ ...prev, rules: !prev.rules }))}
          />

          <CategoryCard
            category={settings.category}
            setCategory={(category) => setSettings((prev) => ({ ...prev, category }))}
            isOpen={openSections.category}
            onToggle={() => setOpenSections((prev) => ({ ...prev, category: !prev.category }))}
            onGenerate={handleGenerateWord}
            isGenerating={isGeneratingWord}
            generationMessage={generationMessage}
            generationError={generationError}
          />

          {needsCustomWord && (
            <p className="text-center text-sm text-red-200">
              Generate a word before creating the lobby.
            </p>
          )}

          {lobbyError && (
            <p className="text-center text-sm font-medium text-red-200">
              {lobbyError}
            </p>
          )}

          <button
            onClick={handleCreateLobby}
            disabled={!canCreateLobby}
            className="w-full rounded-2xl bg-purple-600 px-4 py-4 text-xl text-white start-button transition-all duration-150 hover:enabled:bg-purple-700 active:enabled:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isCreatingLobby ? "Creating Lobby..." : "Create Lobby"}
          </button>
        </div>
      </div>
    </div>
  );
}
