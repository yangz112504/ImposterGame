package main

import (
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
)

// Message represents a WebSocket message
type Message struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// JoinRoomPayload represents the payload for joining a room
type JoinRoomPayload struct {
	Name string `json:"name"`
	Room string `json:"room"`
}

// CreateRoomPayload represents the payload for creating a room
type CreateRoomPayload struct {
	Name     string       `json:"name"`
	Settings GameSettings `json:"settings"`
}

type UpdateSettingsPayload struct {
	Settings GameSettings `json:"settings"`
}

type Room struct {
	mu       sync.RWMutex
	writeMu  sync.Mutex
	id       string
	clients  map[*websocket.Conn]string
	host     *websocket.Conn
	started  bool
	settings GameSettings
	word     string
	imposter *websocket.Conn
	round    *OnlineRound
}

func safeWrite(room *Room, conn *websocket.Conn, v interface{}) error {
	room.writeMu.Lock()
	defer room.writeMu.Unlock()
	return conn.WriteJSON(v)
}

type Category struct {
	Type   string `json:"type"`
	Prompt string `json:"prompt,omitempty"`
	Word   string `json:"word,omitempty"`
}

type GamePhase string

const (
	PhaseReveal     GamePhase = "reveal"
	PhaseDiscussion GamePhase = "discussion"
	PhaseVoting     GamePhase = "voting"
	PhaseResults    GamePhase = "results"
)

type GameSettings struct {
	Players       []string `json:"players"`
	TimerSeconds  int      `json:"timerSeconds"`
	InfiniteTimer bool     `json:"infiniteTimer"`
	ImposterFirst bool     `json:"imposterFirst"`
	SecretMode    bool     `json:"secretMode"`
	Category      Category `json:"category"`
	ClientID      string   `json:"clientId,omitempty"`
}

func normalizeGameSettings(settings *GameSettings) {
	// This function ensures that the game settings have valid values, applying defaults where necessary.
	if settings.Category.Type == "" {
		settings.Category.Type = "general"
	}

	if settings.TimerSeconds <= 0 {
		settings.TimerSeconds = 60
	}
}

type GenerateWordRequest struct {
	Prompt   string `json:"prompt"`
	ClientID string `json:"clientId,omitempty"`
}

type GenerateWordResponse struct {
	Ok      bool   `json:"ok"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
	Word    string `json:"word,omitempty"`
}

type GameCreationResponse struct {
	Ok      bool       `json:"ok"`
	Message string     `json:"message,omitempty"`
	Error   string     `json:"error,omitempty"`
	Game    *GameState `json:"game,omitempty"`
}

type PlayerRole struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role string `json:"role"`
	Word string `json:"word,omitempty"`
}

type VoteRecord struct {
	VoterID        string `json:"voterId"`
	TargetPlayerID string `json:"targetPlayerId"`
}

type VoteState struct {
	Votes            []VoteRecord `json:"votes"`
	AllowVoteChanges bool         `json:"allowVoteChanges"`
	IsComplete       bool         `json:"isComplete"`
}

type ResultState struct {
	VoteTotals     map[string]int `json:"voteTotals"`
	LeaderIDs      []string       `json:"leaderIds"`
	TopVoteCount   int            `json:"topVoteCount"`
	PlayersWin     bool           `json:"playersWin"`
	WinningSide    string         `json:"winningSide"`
	OutcomeMessage string         `json:"outcomeMessage"`
}

type GameState struct {
	GameID         string       `json:"gameId"`
	Phase          GamePhase    `json:"phase"`
	Players        []PlayerRole `json:"players"`
	StartingPlayer int          `json:"startingPlayer"`
	VoteState      VoteState    `json:"voteState"`
	Results        *ResultState `json:"results,omitempty"`
}

type StartVotingResponse struct {
	GameState
}

type SubmitVoteRequest struct {
	VoterID        string `json:"voterId"`
	TargetPlayerID string `json:"targetPlayerId"`
}

type OnlineRound struct {
	Phase string

	ActivePlayers map[*websocket.Conn]string

	RevealReady map[*websocket.Conn]bool

	StartingPlayer string

	TimerSeconds int

	Votes map[*websocket.Conn]*websocket.Conn

	VoteLocked map[*websocket.Conn]bool

	GameState GameState

	AllLocked bool
}
