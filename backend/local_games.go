package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

var localGames = make(map[string]*GameState)
var localGamesMutex sync.RWMutex

var rateLimiter = NewRateLimiter(5, time.Minute) // Allow 5 requests per minute per client

func getLocalGame(gameID string) (*GameState, bool) {
	localGamesMutex.RLock()
	defer localGamesMutex.RUnlock()

	game, exists := localGames[gameID]
	return game, exists
}

func createLocalGame(w http.ResponseWriter, r *http.Request) {
	if handlePreflight(w, r) {
		return
	}

	if r.Method != http.MethodPost {
		writeGameCreationError(w, http.StatusMethodNotAllowed, "invalid request method")
		return
	}

	var settings GameSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		writeGameCreationError(w, http.StatusBadRequest, "invalid request")
		return
	}
	normalizeGameSettings(&settings)

	if len(settings.Players) < 3 {
		writeGameCreationError(w, http.StatusBadRequest, "not enough players")
		return
	}

	if settings.Category.Type == "custom" {
		if strings.TrimSpace(settings.Category.Prompt) == "" {
			writeGameCreationError(w, http.StatusBadRequest, "custom categories need a prompt")
			return
		}
		if strings.TrimSpace(settings.Category.Word) == "" {
			writeGameCreationError(w, http.StatusBadRequest, "generate a word before starting the game")
			return
		}
	}

	gameState, err := generateGame(settings)
	if err != nil {
		writeGameCreationError(w, http.StatusBadRequest, err.Error())
		return
	}

	localGamesMutex.Lock()
	localGames[gameState.GameID] = &gameState
	localGamesMutex.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(GameCreationResponse{
		Ok:      true,
		Message: "Game created successfully.",
		Game:    &gameState,
	})
}

func generateCustomWord(w http.ResponseWriter, r *http.Request) {
	if handlePreflight(w, r) {
		return
	}

	if r.Method != http.MethodPost {
		writeCustomWordError(w, http.StatusMethodNotAllowed, "invalid request method")
		return
	}

	var req GenerateWordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeCustomWordError(w, http.StatusBadRequest, "invalid request")
		return
	}

	prompt := strings.TrimSpace(req.Prompt)
	if prompt == "" {
		writeCustomWordError(w, http.StatusBadRequest, "custom prompt cannot be empty")
		return
	}

	// Generate the word based on the prompt and client ID, using the rate limiter to control request frequency
	result, err := GenerateWordFromCategory(prompt, req.ClientID, rateLimiter)

	if err != nil {
		status := geminiHTTPStatus(err)
		message := geminiErrorMessage(err, result)
		writeCustomWordError(w, status, message)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(GenerateWordResponse{
		Ok:      true,
		Message: fmt.Sprintf("Prompt successfully generated for: %s", prompt),
		Word:    result.Word,
	})
}

func localGameRoutes(w http.ResponseWriter, r *http.Request) {
	if handlePreflight(w, r) {
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "invalid request method", http.StatusBadRequest)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/games/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 {
		http.NotFound(w, r)
		return
	}

	gameID := parts[0]
	action := parts[1]

	game, exists := getLocalGame(gameID)
	if !exists {
		http.Error(w, "game not found", http.StatusNotFound)
		return
	}

	switch action {
	case "start-voting":
		localGamesMutex.Lock()
		startVoting(game)
		response := StartVotingResponse{GameState: *game}
		localGamesMutex.Unlock()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	case "votes":
		var req SubmitVoteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}

		localGamesMutex.Lock()
		err := submitVote(game, req)
		var response GameState
		if err == nil {
			response = *game
		}
		localGamesMutex.Unlock()

		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	case "finish-voting":
		localGamesMutex.Lock()
		finishVoting(game)
		response := *game
		localGamesMutex.Unlock()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	default:
		http.NotFound(w, r)
	}
}

func writeGameCreationError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(GameCreationResponse{
		Ok:    false,
		Error: message,
	})
}

func writeCustomWordError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(GenerateWordResponse{
		Ok:    false,
		Error: message,
	})
}
