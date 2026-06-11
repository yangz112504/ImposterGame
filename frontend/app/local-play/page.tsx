"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  defaultGameSettings,
  GameSettings,
} from "@/lib/gameSettings"
import { PlayersCard } from "@/components/PlayersCard"
import { RulesCard } from "@/components/RulesCard"
import { CategoryCard } from "@/components/CategoryCard"
import { useGameStore } from "@/lib/store";
import { getOrCreateClientId } from "@/lib/clientId";
import { generateCustomWord } from "@/lib/customWord";


export default function Page() {
  const router = useRouter()

  // Load settings from store if available, otherwise use defaults
  const setStoreSettings = useGameStore((state) => state.setSettings);
  const storedSettings = useGameStore((state) => state.settings);

  // Use the store settings as initial value if available
  const [settings, setSettings] = useState<GameSettings>(
    storedSettings ?? defaultGameSettings
  );

  const [openSections, setOpenSections] = useState<{
    players: boolean
    rules: boolean
    category: boolean
  }>({
    players: true,
    rules: false,
    category: false,
  })

  const [isGeneratingWord, setIsGeneratingWord] = useState(false)
  const [generationMessage, setGenerationMessage] = useState<string | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const canStartGame =
    settings.players.length >= 3 &&
    (settings.category.type !== "custom" || Boolean(settings.category.word))
  const hasEnoughPlayers = settings.players.length >= 3
  const needsCustomWord =
    settings.category.type === "custom" && !settings.category.word

  async function handleGenerateWord() {
    setIsGeneratingWord(true)
    setGenerationMessage(null)
    setGenerationError(null)

    try {
      const result = await generateCustomWord({
        prompt: settings.category.prompt ?? "",
        clientId: getOrCreateClientId(),
      })

      setSettings((prev) => ({
        ...prev,
        category: {
          ...prev.category,
          word: result.word,
        },
      }))
      setGenerationMessage(result.message)
      setGenerationError(null)
    } catch (error: unknown) {
      console.error(error)
      setSettings((prev) => ({
        ...prev,
        category: { ...prev.category, word: undefined },
      }))
      setGenerationMessage(null)
      setGenerationError(
        error instanceof Error && error.message
          ? error.message
          : "Failed to generate word."
      )
    } finally {
      setIsGeneratingWord(false)
    }
  }

  

  return (
    <>
      <div className="relative mt-8 font-homepage">
        {/* Back arrow (visually left, layout-independent) */}
        <Link
          href="/"
          className="absolute left-4 top-1 text-white text-2xl hover:opacity-80 transition mr-2"
          aria-label="Back to home"
        >
          ←
        </Link>
        {/* Centered text block */}
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold text-white">
            Local Game Setup
          </h1>

          <p className="text-white text-sm mt-1">
            Configure your game settings below
          </p>
        </div>
      </div>
      <div className="space-y-4 p-4 max-w-md mx-auto font-homepage">
        <PlayersCard
          players={settings.players}
          setPlayers={(players) =>
            setSettings((prev) => ({ ...prev, players }))
          }
          isOpen={openSections.players}
          onToggle={() =>
            setOpenSections({ ...openSections, players: !openSections.players })
          }
        />

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
          setImposterFirst={(v) =>
            setSettings((prev) => ({ ...prev, imposterFirst: v }))
          }
          setSecretMode={(v) =>
            setSettings((prev) => ({ ...prev, secretMode: v }))
          }
          isOpen={openSections.rules}
          onToggle={() =>
            setOpenSections({ ...openSections, rules: !openSections.rules })
          }
        />

        <CategoryCard
          category={settings.category}
          setCategory={(category) =>
            setSettings((prev) => ({ ...prev, category }))
          }
          isOpen={openSections.category}
          onToggle={() =>
            setOpenSections({ ...openSections, category: !openSections.category })
          }
          onGenerate={handleGenerateWord}
          isGenerating={isGeneratingWord}
          generationMessage={generationMessage}
          generationError={generationError}
        />
        {needsCustomWord && (
          <p className="text-center text-sm text-red-300">
            Generate a word before starting the game.
          </p>
        )}
        {!needsCustomWord && !hasEnoughPlayers && (
          <p className="text-center text-sm text-white">
            You need at least 3 players to start
          </p>
        )}

        <button
          disabled={!canStartGame}
          className="bottom-4 w-full rounded-2xl py-4 text-xl text-white start-button"
            onClick={() => {
              setStoreSettings(settings); // Save in Zustand
              console.log("GAME SETTINGS:", settings)
              router.push(
                `/local-play/reveal`
              )
            }}
        >
          Start Game
        </button>
      </div>
    </>
  )
}
