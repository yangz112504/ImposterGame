"use client";

// components/PlayersCard.tsx
import { useState } from "react"
import { SetupCard } from "@/components/SetupCard"

const MIN_PLAYERS = 3
const MAX_PLAYERS = 12

type Props = {
  players: string[]
  setPlayers: (players: string[]) => void
  isOpen: boolean
  onToggle: () => void
}

export function PlayersCard({ players, setPlayers, isOpen, onToggle }: Props) {
    const [name, setName] = useState("")
    const [error, setError] = useState("")


    function triggerError(message: string) {
        setError(message)
        setTimeout(() => setError(""), 10000)
    }

    function addPlayer() {
        const trimmed = name.trim()
        if (!trimmed) return
        if (players.length >= MAX_PLAYERS) return

        const exists = players.some(
            (p) => p.toLowerCase() === trimmed.toLowerCase()
        )
        if (exists) {
            triggerError("Player already exists")
            return
        }

        setPlayers([...players, trimmed])
        setName("")
    }

    function removePlayer(index: number) {
    setPlayers(players.filter((_, i) => i !== index))
    }

    return (
        <SetupCard
        title="Who’s Playing?"
        emoji="🧍"
        isOpen={isOpen}
        onToggle={onToggle}
        >
            <div className="space-y-4">
                <p className="players-status-text">
                {players.length < MIN_PLAYERS
                    ? `Add at least ${MIN_PLAYERS} players to start`
                    : players.length >= MAX_PLAYERS
                    ? "Maximum of 12 players reached"
                    : "3 - 12 players"}
                </p>
                <div className="players-input-wrapper">
                    <input
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value)
                        if (error) setError("")
                    }
                    }
                    placeholder="Player name"
                    className={`players-input ${error ? "input-error shake" : ""}`}
                    name="player-input"
                    id="player-input"
                    autoComplete="new-password"
                    inputMode="text"
                    enterKeyHint="done"
                    onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault()
                                    addPlayer()
                                }
                    }}
                    />
                    <button
                    onClick={addPlayer}
                    disabled={players.length >= MAX_PLAYERS}
                    className="players-add-btn"
                    >
                    +
                    </button>
                </div>

                 {error && (
                        <p className="text-red-500 text-sm -mt-2">
                            {error}
                        </p>
                )}
                <div className="players-list-wrapper">
                {players.map((p, i) => (
                    <div
                    key={i}
                    className="player-badge"
                    >
                        <span>{p}</span>
                        <button
                            onClick={() => removePlayer(i)}
                            className="player-remove-btn"
                            aria-label="Remove player"
                            >
                            ✕
                        </button>
                    </div>
                ))}
                </div>
            </div>
        </SetupCard>
    )
}
