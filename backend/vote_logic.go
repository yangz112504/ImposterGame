package main

import (
	"fmt"
	"math/rand"
	"time"
)

func newGameID() string {
	return fmt.Sprintf("game-%d-%d", time.Now().UnixNano(), rand.Intn(1000))
}

func startVoting(game *GameState) {
	game.Phase = PhaseVoting
	game.VoteState = VoteState{
		Votes:            []VoteRecord{},
		AllowVoteChanges: true,
		IsComplete:       false,
	}
	game.Results = nil
}

func submitVote(game *GameState, req SubmitVoteRequest) error {
	if req.VoterID == "" || req.TargetPlayerID == "" {
		return fmt.Errorf("voterId and targetPlayerId are required")
	}

	playerIDs := make(map[string]PlayerRole, len(game.Players))
	for _, player := range game.Players {
		playerIDs[player.ID] = player
	}

	voter, voterExists := playerIDs[req.VoterID]
	if !voterExists {
		return fmt.Errorf("invalid voterId")
	}
	if _, targetExists := playerIDs[req.TargetPlayerID]; !targetExists {
		return fmt.Errorf("invalid targetPlayerId")
	}
	if voter.ID == req.TargetPlayerID {
		return fmt.Errorf("players cannot vote for themselves")
	}

	replaced := false
	for i, vote := range game.VoteState.Votes {
		if vote.VoterID == req.VoterID {
			game.VoteState.Votes[i].TargetPlayerID = req.TargetPlayerID
			replaced = true
			break
		}
	}
	if !replaced {
		game.VoteState.Votes = append(game.VoteState.Votes, VoteRecord{
			VoterID:        req.VoterID,
			TargetPlayerID: req.TargetPlayerID,
		})
	}

	return nil
}

func finishVoting(game *GameState) {
	game.Phase = PhaseResults
	game.VoteState.IsComplete = true
	game.Results = calculateResults(game)
}

func calculateResults(game *GameState) *ResultState {
	voteTotals := make(map[string]int, len(game.Players))
	playerByID := make(map[string]PlayerRole, len(game.Players))
	for _, player := range game.Players {
		voteTotals[player.ID] = 0
		playerByID[player.ID] = player
	}

	// Tally the votes
	for _, vote := range game.VoteState.Votes {
		if _, exists := voteTotals[vote.TargetPlayerID]; exists {
			voteTotals[vote.TargetPlayerID]++
		}
	}

	topVoteCount := 0
	leaderIDs := []string{}
	// Determine which player(s) received the most votes
	for _, player := range game.Players {
		total := voteTotals[player.ID]
		if total > topVoteCount {
			topVoteCount = total
			leaderIDs = []string{player.ID}
			continue
		}
		if total == topVoteCount && total > 0 {
			leaderIDs = append(leaderIDs, player.ID)
		}
	}

	playersWin := false
	outcomeMessage := "The players failed to identify the imposter."
	if len(leaderIDs) == 1 && playerByID[leaderIDs[0]].Role == "imposter" {
		playersWin = true
		outcomeMessage = fmt.Sprintf("%s was correctly identified as the imposter.", playerByID[leaderIDs[0]].Name)
	} else if len(leaderIDs) > 1 {
		outcomeMessage = "The vote ended in a tie, so the imposter wins."
	}

	winningSide := "imposter"
	if playersWin {
		winningSide = "players"
	}

	return &ResultState{
		VoteTotals:     voteTotals,
		LeaderIDs:      leaderIDs,
		TopVoteCount:   topVoteCount,
		PlayersWin:     playersWin,
		WinningSide:    winningSide,
		OutcomeMessage: outcomeMessage,
	}
}
