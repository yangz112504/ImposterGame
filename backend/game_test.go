package main

import (
	"math/rand"
	"testing"
	"time"
)

func TestGenerateGameUsesCachedCustomWord(t *testing.T) {
	settings := GameSettings{
		Players: []string{"A", "B", "C"},
		Category: Category{
			Type: "custom",
			Word: "koala",
		},
	}

	game, err := generateGame(settings)
	if err != nil {
		t.Fatalf("generateGame returned error: %v", err)
	}

	for _, player := range game.Players {
		if player.Role == "innocent" && player.Word != "koala" {
			t.Fatalf("expected cached word to be used, got %q", player.Word)
		}
	}
}

func TestGenerateGameRejectsMissingCustomWord(t *testing.T) {
	settings := GameSettings{
		Players: []string{"A", "B", "C"},
		Category: Category{
			Type:   "custom",
			Prompt: "animals",
		},
	}

	_, err := generateGame(settings)
	if err == nil {
		t.Fatal("expected error when custom word is missing")
	}
}

func TestGenerateGameDoesNotStartWithImposterWhenDisabled(t *testing.T) {
	rand.Seed(1)
	defer rand.Seed(time.Now().UnixNano())

	settings := GameSettings{
		Players:       []string{"A", "B", "C", "D"},
		ImposterFirst: false,
		Category: Category{
			Type: "custom",
			Word: "koala",
		},
	}

	game, err := generateGame(settings)
	if err != nil {
		t.Fatalf("generateGame returned error: %v", err)
	}

	startingPlayer := game.Players[game.StartingPlayer]
	if startingPlayer.Role == "imposter" {
		t.Fatalf("expected an innocent to start when imposterFirst is disabled, got %q", startingPlayer.Name)
	}
}
