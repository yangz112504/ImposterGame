package main

import (
	"log"
	"math/rand"
	"sync"

	"github.com/gorilla/websocket"
)

var rooms = make(map[string]*Room)
var roomsMutex sync.RWMutex
var connToRoom = make(map[*websocket.Conn]*Room)
var connToRoomMutex sync.RWMutex

func generateRoomCode() string {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	for i := range b {
		b[i] = alphabet[int(b[i])%len(alphabet)]
	}
	return string(b)
}

func createRoom() (string, *Room) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	var roomID string
	for {
		roomID = generateRoomCode()
		// If this room code is NOT already being used...
		if _, exists := rooms[roomID]; !exists {
			break
		}
	}

	room := &Room{
		id:      roomID,
		clients: make(map[*websocket.Conn]string),
		settings: GameSettings{
			Category: Category{Type: "general"},
		},
	}
	rooms[roomID] = room

	return roomID, room
}

func destroyRoom(room *Room) {
	room.mu.Lock()
	clients := make([]*websocket.Conn, 0, len(room.clients))
	for client := range room.clients {
		clients = append(clients, client)
	}
	room.clients = make(map[*websocket.Conn]string)
	room.host = nil
	room.imposter = nil
	room.started = false
	room.mu.Unlock()

	roomsMutex.Lock()
	if current, exists := rooms[room.id]; exists && current == room {
		delete(rooms, room.id)
	}
	roomsMutex.Unlock()

	for _, client := range clients {
		removeConnRoom(client)
		_ = client.Close()
	}
}

func getRoom(roomID string) (*Room, bool) {
	roomsMutex.RLock()
	defer roomsMutex.RUnlock()

	room, exists := rooms[roomID]
	return room, exists
}

func getConnRoom(conn *websocket.Conn) (*Room, bool) {
	connToRoomMutex.RLock()
	defer connToRoomMutex.RUnlock()

	room, exists := connToRoom[conn]
	return room, exists
}

func setConnRoom(conn *websocket.Conn, room *Room) {
	connToRoomMutex.Lock()
	defer connToRoomMutex.Unlock()
	connToRoom[conn] = room
}

func removeConnRoom(conn *websocket.Conn) (*Room, bool) {
	connToRoomMutex.Lock()
	defer connToRoomMutex.Unlock()

	room, exists := connToRoom[conn]
	if exists {
		delete(connToRoom, conn)
	}

	return room, exists
}

func snapshotRoomClients(room *Room) map[*websocket.Conn]string {
	room.mu.RLock()
	defer room.mu.RUnlock()

	clients := make(map[*websocket.Conn]string, len(room.clients))
	for client, name := range room.clients {
		clients[client] = name
	}

	return clients
}

func broadcastPlayersUpdate(room *Room) {
	clientsSnapshot := snapshotRoomClients(room)

	names := make([]string, 0, len(clientsSnapshot))
	for _, name := range clientsSnapshot {
		names = append(names, name)
	}

	for client := range clientsSnapshot {
		if err := client.WriteJSON(map[string]interface{}{
			"type": "players_update",
			"payload": map[string]interface{}{
				"players": names,
			},
		}); err != nil {
			log.Printf("Failed to send players update: %v\n", err)
		}
	}
}

func broadcastVoteUpdate(room *Room) {
	room.mu.RLock() // this so that we can read room.votes without worrying about race conditions
	total := len(room.round.ActivePlayers)
	locked := 0
	for _, l := range room.round.VoteLocked {
		if l {
			locked++
		}
	}

	// Build vote totals by name to see who got how many votes
	voteTotals := make(map[string]int)
	for _, player := range room.round.Votes {
		name := room.round.ActivePlayers[player]
		voteTotals[name]++
	}

	// Build the list of clients to send the update to
	clients := make([]*websocket.Conn, 0, total)
	for c := range room.round.ActivePlayers {
		clients = append(clients, c)
	}

	// Make sure to get the host while we still have the read lock, so that we can include whether each client is the host in the update
	host := room.host
	room.mu.RUnlock()

	for _, c := range clients {
		_ = c.WriteJSON(map[string]interface{}{
			"type": "vote_update",
			"payload": map[string]interface{}{
				"locked":     locked,
				"total":      total,
				"voteTotals": voteTotals,
				"allLocked":  locked == total,
				"isHost":     c == host,
			},
		})
	}
}

func broadcastResults(room *Room) {
	room.mu.Lock() // Write lock needed because we're modifying room.round.Phase, and we also want to prevent any changes to votes while we're tallying them and sending the results
	room.round.Phase = string(PhaseResults)

	// Tally Votes
	voteCounts := make(map[*websocket.Conn]int)
	for _, player := range room.round.Votes {
		voteCounts[player]++
	}

	// Find the player(s) with the most votes
	maxVotes := 0
	for _, count := range voteCounts {
		if count > maxVotes {
			maxVotes = count
		}
	}

	leaderNames := []string{}
	voteTotals := make(map[string]int)
	for c, count := range voteCounts {
		name := room.round.ActivePlayers[c]
		voteTotals[name] = count
		if count == maxVotes {
			leaderNames = append(leaderNames, name)
		}
	}

	imposterName := room.round.ActivePlayers[room.imposter]
	playersWin := len(leaderNames) == 1 && leaderNames[0] == imposterName

	winningSide := "imposter"
	if playersWin {
		winningSide = "players"
	}

	outcomeMessage := "The Imposter won!"
	if playersWin {
		outcomeMessage = "The players found the imposter!"
	}

	// Find the word from an innocent player
	word := ""
	for _, p := range room.round.GameState.Players {
		if p.Role == "innocent" {
			word = p.Word
			break
		}
	}

	// Build the list of clients to send the update to
	clients := make([]*websocket.Conn, 0, len(room.round.ActivePlayers))
	for c := range room.round.ActivePlayers {
		clients = append(clients, c)
	}
	room.mu.Unlock()

	for _, c := range clients {
		_ = c.WriteJSON(map[string]interface{}{
			"type": "results",
			"payload": map[string]interface{}{
				"voteTotals":     voteTotals,
				"leaderNames":    leaderNames,
				"topVoteCount":   maxVotes,
				"playersWin":     playersWin,
				"winningSide":    winningSide,
				"outcomeMessage": outcomeMessage,
				"imposterName":   imposterName,
				"word":           word,
			},
		})
	}
}

func sendSettingsUpdate(conn *websocket.Conn, settings GameSettings) error {
	return conn.WriteJSON(map[string]interface{}{
		"type": "settings_update",
		"payload": map[string]interface{}{
			"settings": settings,
		},
	})
}
