"use client";

// components/CategoryCard.tsx
import { SetupCard } from "./SetupCard"

type Props = {
  category: {
    type: "general" | "bowdoin" | "custom"
    prompt?: string
    word?: string
  }
  setCategory: (c: Props["category"]) => void
  isOpen: boolean
  onToggle: () => void
  onGenerate?: () => void
  isGenerating?: boolean
  generationMessage?: string | null
  generationError?: string | null
}

export function CategoryCard({
  category,
  setCategory,
  isOpen,
  onToggle,
  onGenerate,
  isGenerating,
  generationMessage,
  generationError,
}: Props) {
  const updateCategoryType = (type: Props["category"]["type"]) => {
    setCategory({
      ...category,
      type,
      word: undefined,
    })
  }

  return (
    <SetupCard
      title="What’s the Word?"
      emoji="🧠"
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        <div className="category-buttons">
          <button
            onClick={() => updateCategoryType("general")}
            className={`category-btn ${
              category.type === "general"
                ? "active"
                : "inactive"
            }`}
          >
            🎁 General
          </button>

          <button
            onClick={() => updateCategoryType("bowdoin")}
            className={`category-btn ${
              category.type === "bowdoin"
                ? "active"
                : "inactive"
            }`}
          >
            🐻‍❄️ Bowdoin
          </button>

          <button
            onClick={() => updateCategoryType("custom")}
            className={`category-btn ${
              category.type === "custom"
                ? "active"
                : "inactive"
            }`}
          >
            ✍️ Custom
          </button>
        </div>

        {category.type === "custom" && (
          <div className="category-custom-section space-y-2">
            <input
              placeholder="Describe a category..."
              className="category-custom-input"
              value={category.prompt || ""}
              onChange={(e) =>
                setCategory({ ...category, prompt: e.target.value, word: undefined })
              }
            />

            <button
              className="generate-word-btn"
              disabled={!category.prompt?.trim() || isGenerating}
              onClick={onGenerate}
            >
              {isGenerating ? "Generating..." : "🎲 Generate Word"}
            </button>

            {generationMessage && (
              <p className="text-sm font-medium text-green-700 mt-2">
                {generationMessage}
              </p>
            )}

            {generationError && (
              <p className="text-sm font-medium text-red-700 mt-2">
                {generationError}
              </p>
            )}
          </div>
        )}
      </div>
    </SetupCard>
  )
}
