"use client";

// components/SetupCard.tsx
import { ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"

type SetupCardProps = {
  title: string
  emoji?: string
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}

export function SetupCard({
  title,
  emoji,
  isOpen,
  onToggle,
  children,
}: SetupCardProps) {
  return (
    <div className="setup-card">
      <button
        onClick={onToggle}
        className="setup-card-header"
      >
        <h2 className="setup-card-title">
          {emoji && <span className="mr-2">{emoji}</span>}
          {title}
        </h2>
        <span className="setup-card-toggle">{isOpen ? "−" : "+"}</span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="setup-card-content"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    
  )
}
