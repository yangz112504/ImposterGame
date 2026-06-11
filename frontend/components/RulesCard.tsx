"use client";

// components/RulesCard.tsx
import { SetupCard } from "./SetupCard"
import {
  MAX_TIMER_SECONDS,
  TIMER_STEP_SECONDS,
} from "@/lib/gameSettings"

type Props = {
  timerSeconds: number
  infiniteTimer: boolean
  setTimerSeconds: (seconds: number) => void
  setInfiniteTimer: (value: boolean) => void
  imposterFirst: boolean
  setImposterFirst: (v: boolean) => void
  secretMode: boolean
  setSecretMode: (v: boolean) => void
  isOpen: boolean
  onToggle: () => void
}

export function RulesCard({
  timerSeconds,
  infiniteTimer,
  setTimerSeconds,
  setInfiniteTimer,
  imposterFirst,
  setImposterFirst,
  secretMode,
  setSecretMode,
  isOpen,
  onToggle,
}: Props) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs === 0 ? `${mins}:00` : `${mins}:${secs}`
  }

  const handleTimerIncrement = () => {
    if (infiniteTimer) return
    if (timerSeconds >= MAX_TIMER_SECONDS) {
      setInfiniteTimer(true)
    } else {
      setTimerSeconds(timerSeconds + TIMER_STEP_SECONDS)
    }
  }

  const handleTimerDecrement = () => {
    if (infiniteTimer) {
      setInfiniteTimer(false)
    } else if (timerSeconds <= TIMER_STEP_SECONDS) {
      return
    } else {
      setTimerSeconds(timerSeconds - TIMER_STEP_SECONDS)
    }
  }
  return (
    <SetupCard
      title="Settings"
      emoji="⚙️"
      isOpen={isOpen}
      onToggle={onToggle}
    >
    <div className="space-y-6 mt-2">
      {/* Toggles */}
      <div className="rules-label">
        <span>🎤 Imposter could go first</span>
        <input
        type="checkbox"
        checked={imposterFirst}
        onChange={(e) => setImposterFirst(e.target.checked)}
        className="rules-checkbox"
        />
      </div>

    <div className="rules-label">
      <div className="flex items-center gap-2">
        <span>🎲 Secret mode</span>
        <div className="tooltip-group">
          <span className="tooltip-icon">ℹ️</span>
          <div className="tooltip-content">
            30% chance that everyone or no one is imposter
          </div>
        </div>
      </div>
      <input
        type="checkbox"
        checked={secretMode}
        onChange={(e) => setSecretMode(e.target.checked)}
        className="rules-checkbox"
      />
    </div>

        {/* Timer Controls */}
        <div>
          <p className="rules-timer-title">⏱ Timer</p>
          <div className="timer-controls">
            <button
              onClick={(e) => {
                handleTimerDecrement()
                e.currentTarget.blur()
              }}
              disabled={!infiniteTimer && timerSeconds === TIMER_STEP_SECONDS}
              className="timer-btn timer-btn-decrement"
            >
              −
            </button>
            <div className="timer-display">
              {infiniteTimer ? "∞" : formatTime(timerSeconds)}
            </div>
            <button
              onClick={(e) => {
                handleTimerIncrement()
                e.currentTarget.blur()
              }}
              disabled={infiniteTimer}
              className="timer-btn timer-btn-increment"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </SetupCard>
  )
}
