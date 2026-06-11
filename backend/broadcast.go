package main

import (
	"github.com/gorilla/websocket"
)

func broadcastReadinessUpdate(room *Room) {
	room.mu.RLock()
	total := len(room.round.ActivePlayers)
	ready := 0
	for _, r := range room.round.RevealReady {
		if r {
			ready++
		}
	}
	clients := make([]*websocket.Conn, 0, total)
	for c := range room.round.ActivePlayers {
		clients = append(clients, c)
	}
	room.mu.RUnlock()

	for _, c := range clients {
		_ = c.WriteJSON(map[string]interface{}{
			"type": "readiness_update",
			"payload": map[string]interface{}{
				"ready": ready,
				"total": total,
			},
		})
	}
}

func broadcastPhaseChange(room *Room, phase GamePhase) {
	room.mu.RLock()
	clients := make([]*websocket.Conn, 0, len(room.round.ActivePlayers))
	for c := range room.round.ActivePlayers {
		clients = append(clients, c)
	}
	startingPlayer := room.round.StartingPlayer
	timerSeconds := room.round.TimerSeconds
	host := room.host
	room.mu.RUnlock()

	for _, c := range clients {
		payload := map[string]interface{}{
			"phase":          string(phase),
			"startingPlayer": startingPlayer,
			"timerSeconds":   timerSeconds,
			"isHost":         c == host,
		}
		_ = c.WriteJSON(map[string]interface{}{
			"type":    "phase_change",
			"payload": payload,
		})
	}
}
