package main

import (
	"errors"
	"fmt"
	"math/rand"
	"strings"
)

// generateGame creates roles, picks the word, and selects starting player
func generateGame(settings GameSettings) (GameState, error) {
	numPlayers := len(settings.Players)

	// Decide imposters
	var imposterIndices []int
	if settings.SecretMode {
		if rand.Float64() < 0.3 { // 30% chance
			if rand.Float64() < 0.5 {
				imposterIndices = []int{} // no imposters
			} else {
				imposterIndices = make([]int, numPlayers) // everyone is imposter
				for i := range imposterIndices {
					imposterIndices[i] = i
				}
			}
		} else {
			imposterIndices = []int{rand.Intn(numPlayers)}
		}
	} else {
		imposterIndices = []int{rand.Intn(numPlayers)}
	}

	// Pick the word
	var chosenWord string

	if settings.Category.Type == "custom" {
		chosenWord = strings.TrimSpace(settings.Category.Word)
		if chosenWord == "" {
			return GameState{}, errors.New("custom word has not been generated yet")
		}
	} else {
		wordBank := getWordBank(settings.Category.Type)
		chosenWord = wordBank[rand.Intn(len(wordBank))]
	}

	// Assign roles
	players := make([]PlayerRole, numPlayers)

	for i := 0; i < numPlayers; i++ {
		isImposter := false
		for _, idx := range imposterIndices {
			if i == idx {
				isImposter = true
				break
			}
		}

		if isImposter {
			players[i] = PlayerRole{
				ID:   fmt.Sprintf("player-%d", i+1),
				Name: settings.Players[i],
				Role: "imposter",
			}
		} else {
			players[i] = PlayerRole{
				ID:   fmt.Sprintf("player-%d", i+1),
				Name: settings.Players[i],
				Role: "innocent",
				Word: chosenWord,
			}
		}
	}

	// Pick starting player
	var startingPlayer int
	if settings.ImposterFirst {
		// anyone can go first, even the imposter
		startingPlayer = rand.Intn(numPlayers)
	} else {
		innocentIndices := []int{}
		for i, p := range players {
			if p.Role == "innocent" {
				innocentIndices = append(innocentIndices, i)
			}
		}
		if len(innocentIndices) > 0 {
			startingPlayer = innocentIndices[rand.Intn(len(innocentIndices))]
		} else {
			// Secret mode can produce all-imposter rounds; fall back safely.
			startingPlayer = rand.Intn(numPlayers)
		}
	}

	return GameState{
		GameID:         newGameID(),
		Phase:          PhaseReveal,
		Players:        players,
		StartingPlayer: startingPlayer,
		VoteState: VoteState{
			Votes:            []VoteRecord{},
			AllowVoteChanges: true,
			IsComplete:       false,
		},
		Results: nil,
	}, nil
}
