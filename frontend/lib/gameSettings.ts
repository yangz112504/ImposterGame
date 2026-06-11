// GameSettings is the core configuration for a game session, encompassing player information, game rules, and category details. It serves as the blueprint for setting up and managing a game instance, ensuring that all necessary parameters are defined for a smooth gaming experience.
export type GameSettings = {
  players: string[]
  timerSeconds: number
  infiniteTimer: boolean
  imposterFirst: boolean
  secretMode: boolean
  category: {
    type: "general" | "bowdoin" | "custom"
    prompt?: string
    word?: string
  }
  clientId?: string // Optional because its needed for API requests and lobby identification for Online play but not necessary for Local play
}

export const DEFAULT_TIMER_SECONDS = 60
export const TIMER_STEP_SECONDS = 30
export const MAX_TIMER_SECONDS = 300

export const defaultGameSettings: GameSettings = {
  players: [],
  timerSeconds: DEFAULT_TIMER_SECONDS,
  infiniteTimer: false,
  imposterFirst: false,
  secretMode: false,
  category: { type: "general" },
}

export type GamePhase = "reveal" | "discussion" | "voting" | "results"

export type PlayerRole = {
  id: string
  name: string
  role: "innocent" | "imposter"
  word?: string
}

export type VoteRecord = {
  voterId: string
  targetPlayerId: string
}

export type VoteState = {
  votes: VoteRecord[]
  allowVoteChanges: boolean
  isComplete: boolean
}

export type ResultState = {
  voteTotals: Record<string, number>
  leaderIds: string[]
  topVoteCount: number
  playersWin: boolean
  winningSide: "players" | "imposter"
  outcomeMessage: string
}

// GameState is different from GameSettings in that it represents the current status of an active game session, including dynamic information such as player roles, game phase, and voting status. While GameSettings is used for configuring a game before it starts, GameState is used to track the ongoing state of the game as it progresses through its various phases.
export type GameState = {
  gameId: string
  phase: GamePhase
  players: PlayerRole[]
  startingPlayer: number
  voteState: VoteState
  results?: ResultState
}

export type GameCreationResponse = {
  ok: boolean
  message?: string
  error?: string
  game?: GameState
}

export type GenerateWordResponse = {
  ok: boolean
  message?: string
  error?: string
  word?: string
}
