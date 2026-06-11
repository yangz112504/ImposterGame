package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/websocket"
)

var allowedOrigin = os.Getenv("FRONTEND_ORIGIN")

// Upgrades HTTP connections to WebSocket connections and handles incoming messages
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return r.Header.Get("Origin") == allowedOrigin
	},
}

// Handler for WebSocket connections
func ws(w http.ResponseWriter, r *http.Request) {

	// Upgrade the HTTP connection to a WebSocket connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade failed:", err)
		return
	}
	log.Println("connected")

	// Listen for incoming messages from the client
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("read error", err)
			if room, exists := removeConnRoom(conn); exists {
				room.mu.Lock()
				isHost := room.host == conn

				if !room.started {
					delete(room.clients, conn)
					room.mu.Unlock()

					if isHost {
						room.mu.RLock()
						for client := range room.clients {
							if client != conn {
								_ = client.WriteJSON(map[string]interface{}{
									"type": "host_left",
									"payload": map[string]string{
										"message": "The host left the room",
									},
								})
							}
						}
						room.mu.RUnlock()
						destroyRoom(room)
					} else {
						broadcastPlayersUpdate(room)
					}
					conn.Close()
					return
				}
				// If the game has already started and a player disconnects, we want to remove them from the active player list for the current round so that they don't get a role update or voting update after they've left, and so that they can't vote or submit a guess after they've left
				if room.round != nil {
					delete(room.round.ActivePlayers, conn)
					delete(room.round.RevealReady, conn)
					delete(room.round.VoteLocked, conn)
					delete(room.round.Votes, conn)
				}
				room.mu.Unlock()
				if isHost {
					room.mu.RLock()
					for client := range room.clients {
						if client != conn {
							_ = client.WriteJSON(map[string]interface{}{
								"type": "host_left",
								"payload": map[string]string{
									"message": "The host left the game",
								},
							})
						}
					}
					room.mu.RUnlock()
					destroyRoom(room)
					conn.Close()
					return
				}
			}
			conn.Close()
			break
		}

		// Parse the incoming message as JSON
		var msg Message
		err = json.Unmarshal(message, &msg)
		if err != nil {
			log.Println("invalid JSON:", err)
			continue
		}

		// Handle the message based on its type
		switch msg.Type {
		case "create_room":
			//create unique code
			// create room
			// attach connection to room
			// add host to clients
			// send response
			var payload CreateRoomPayload
			if err := json.Unmarshal(msg.Payload, &payload); err != nil {
				log.Println("invalid create_room payload:", err)
				continue
			}
			log.Printf("Create room request received from %s\n", payload.Name)

			// Create room
			roomID, room := createRoom()

			log.Printf("Created room: %s\n", roomID)

			// Add host to room
			room.mu.Lock()
			room.host = conn
			room.settings = payload.Settings
			normalizeGameSettings(&room.settings)
			room.clients[conn] = payload.Name
			playerCount := len(room.clients)
			room.mu.Unlock()

			log.Printf("%s added to room %s\n", payload.Name, roomID)
			log.Printf("Players currently in room: %d\n", playerCount)

			// Associate websocket connection with room
			setConnRoom(conn, room) // This will allow us to find the room later when the client disconnects

			if _, exists := getConnRoom(conn); exists {
				log.Println("Connection successfully mapped to room")
			}

			// Debug room count
			roomsMutex.RLock()
			log.Printf("Total active rooms: %d\n", len(rooms))
			roomsMutex.RUnlock()

			// Communicate back with the frontend that the room was created and provide the room ID
			err := conn.WriteJSON(map[string]interface{}{
				"type": "room_created",
				"payload": map[string]string{
					"room": roomID,
				},
			})

			if err != nil {
				log.Printf("Failed to send room_created: %v\n", err)
				continue
			}

			log.Printf("room_created sent for room %s\n", roomID)
			if err := sendSettingsUpdate(conn, room.settings); err != nil {
				log.Printf("Failed to send settings_update: %v\n", err)
			}

			// Broadcast current player list
			broadcastPlayersUpdate(room)

			log.Printf("players_update broadcasted for room %s\n", roomID)

		case "join_room":
			var payload JoinRoomPayload
			if err := json.Unmarshal(msg.Payload, &payload); err != nil {
				log.Println("invalid join_room payload:", err)
				continue
			}
			log.Println("Player joined:", payload.Name)

			// Find the room the client wants to join
			room, exists := getRoom(payload.Room)
			if !exists {
				log.Printf("Room %s does not exist\n", payload.Room)

				_ = conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"payload": map[string]string{
						"message": "Room not found",
					},
				})
				continue
			}

			room.mu.Lock()
			nameTaken := false
			// Reject duplicate names
			for _, name := range room.clients {
				if name == payload.Name {
					nameTaken = true
					break
				}
			}
			if nameTaken {
				room.mu.Unlock()
				log.Printf("Name %s is already taken in room %s\n", payload.Name, payload.Room)
				_ = conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"payload": map[string]string{
						"message": "Name is already taken in this room",
					},
				})
				continue
			}

			room.clients[conn] = payload.Name
			room.mu.Unlock()
			setConnRoom(conn, room) // This will allow us to find the room later when the client disconnects
			broadcastPlayersUpdate(room)

		case "update_settings":

			var payload UpdateSettingsPayload
			if err := json.Unmarshal(msg.Payload, &payload); err != nil {
				log.Println("invalid update_settings payload:", err)
				continue
			}
			log.Println("🔥 UPDATE SETTINGS RECEIVED")
			log.Printf("Payload: %+v\n", payload)

			room, exists := getConnRoom(conn)
			if !exists {
				log.Println("Client not in any room")
				_ = conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"payload": map[string]string{
						"message": "Room not found",
					},
				})
				continue
			}

			room.mu.Lock()
			if room.started {
				room.mu.Unlock()
				_ = conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"payload": map[string]string{
						"message": "Game already started",
					},
				})
				continue
			}
			if room.host != conn {
				room.mu.Unlock()
				_ = conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"payload": map[string]string{
						"message": "Only the host can update settings",
					},
				})
				continue
			}

			room.settings = payload.Settings
			normalizeGameSettings(&room.settings)
			if room.settings.Category.Type == "custom" {
				if strings.TrimSpace(room.settings.Category.Prompt) == "" {
					room.mu.Unlock()
					_ = conn.WriteJSON(map[string]interface{}{
						"type": "error",
						"payload": map[string]string{
							"message": "Custom prompt is required",
						},
					})
					continue
				}
				if strings.TrimSpace(room.settings.Category.Word) == "" {
					room.mu.Unlock()
					_ = conn.WriteJSON(map[string]interface{}{
						"type": "error",
						"payload": map[string]string{
							"message": "Custom word is required",
						},
					})
					continue
				}
			}
			room.mu.Unlock()

			// Already guarnateed that the client is in a room and IS the host, so we can just send the updated settings back to them without needing to check for errors again
			if err := sendSettingsUpdate(conn, room.settings); err != nil {
				log.Printf("Failed to send settings_update: %v\n", err)
			}

		case "start_game":

			room, exists := getConnRoom(conn)

			// Checks if room existts
			if !exists {
				log.Println("Client not in any room")
				_ = conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"payload": map[string]string{
						"message": "Room not found",
					},
				})
				continue
			}

			// This part checks if the client is the host, if the game has already started, and if there are enough players to start the game. If any of these checks fail, it sends an error message back to the client and continues to the next iteration of the loop without starting the game.
			room.mu.Lock()
			if room.host != conn {
				room.mu.Unlock()
				_ = conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"payload": map[string]string{
						"message": "Only the host can start the game",
					},
				})
				continue
			}

			// If the game has already started, we don't want to start it again
			if room.started {
				room.mu.Unlock()
				log.Println("Game already started in this room")
				_ = conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"payload": map[string]string{
						"message": "Game already started",
					},
				})
				continue
			}

			if len(room.clients) < 3 {
				room.mu.Unlock()
				log.Println("Not enough players to start the game")
				_ = conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"payload": map[string]string{
						"message": "At least 3 players required to start the game",
					},
				})
				continue
			}

			room.started = true
			clientNames := make(map[*websocket.Conn]string, len(room.clients))
			playerNames := make([]string, 0, len(room.clients))
			for client, name := range room.clients {
				clientNames[client] = name
				playerNames = append(playerNames, name)
			}

			room.mu.Unlock()
			log.Println("Game started in room")

			roomSettings := room.settings
			normalizeGameSettings(&roomSettings) // Just makes sure that the settings are valid and have default values where necessary

			roomSettings.Players = playerNames
			settings := roomSettings

			gameState, err := generateGame(settings)
			if err != nil {
				room.mu.Lock()
				room.started = false
				room.mu.Unlock()

				log.Printf("Failed to generate game: %v\n", err)
				_ = conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"payload": map[string]string{
						"message": geminiErrorMessage(err, nil),
					},
				})
				continue
			}

			// Initially set all players' reveal ready to false
			revealReady := make(map[*websocket.Conn]bool)
			for client := range clientNames {
				revealReady[client] = false
			}

			// After start_game, room.round.ActivePlayers becomes the source of truth for the round because if players disconnect during the game, we want to be able to remove them from the active player list and not have to worry about checking if they're in the original gameState.Players list or not. Also, we need to keep track of who is still active in the game for voting and discussion purposes
			activePlayers := make(map[*websocket.Conn]string, len(clientNames))
			for c, name := range clientNames {
				activePlayers[c] = name
			}

			// Map player names to their roles and words, then send this info to each player individually. Also keep track of who the imposter is so we can easily check for them later when they submit their guess
			room.mu.Lock()
			room.round = &OnlineRound{
				Phase:          string(PhaseReveal),
				ActivePlayers:  activePlayers,
				RevealReady:    revealReady,
				StartingPlayer: gameState.Players[gameState.StartingPlayer].Name,
				TimerSeconds:   settings.TimerSeconds,
				Votes:          make(map[*websocket.Conn]*websocket.Conn),
				VoteLocked:     make(map[*websocket.Conn]bool),
				GameState:      gameState,
			}
			room.mu.Unlock()

			for i, player := range settings.Players {
				for client, name := range clientNames {
					if name != player {
						continue
					}

					playerData := gameState.Players[i]

					if playerData.Role == "imposter" {
						room.mu.Lock()
						room.imposter = client
						room.mu.Unlock()
					}

					payload := map[string]interface{}{
						"role": playerData.Role,
					}
					if playerData.Word != "" {
						payload["word"] = playerData.Word
					}

					if err := safeWrite(room, client, map[string]interface{}{
						"type":    "role",
						"payload": payload,
					}); err != nil {
						log.Printf("Failed to send role to %s: %v\n", name, err)
					}

					break
				}
			}

			// Tell everyone the round has started
			room.mu.RLock()
			allClients := make([]*websocket.Conn, 0, len(room.clients))
			for client := range room.clients {
				allClients = append(allClients, client)
			}
			room.mu.RUnlock()

			for _, client := range allClients {
				if err := safeWrite(room, client, map[string]interface{}{
					"type": "round_started",
					"payload": map[string]interface{}{
						"startingPlayer": gameState.Players[gameState.StartingPlayer].Name,
						"phase":          string(PhaseReveal),
					},
				}); err != nil {
					log.Printf("Failed to send round_started: %v\n", err)
				}
			}
		case "reveal_ready":
			room, exists := getConnRoom(conn)
			if !exists {
				continue
			}

			room.mu.Lock()
			// This check is necessary because it's possible for a player to click "ready" and then disconnect before the server processes that message, so we need to make sure the round still exists and is in the reveal phase before we try to update their ready status
			if room.round == nil || room.round.Phase != string(PhaseReveal) {
				room.mu.Unlock()
				continue
			}
			room.round.RevealReady[conn] = true

			// Check if everyone is ready
			allReady := true
			for c := range room.round.ActivePlayers {
				if !room.round.RevealReady[c] {
					allReady = false
					break
				}
			}
			room.mu.Unlock()

			broadcastReadinessUpdate(room)

			if allReady {
				room.mu.Lock()
				room.round.Phase = string(PhaseDiscussion)
				room.mu.Unlock()
				broadcastPhaseChange(room, PhaseDiscussion)
			}
		case "submit_vote":
			var payload struct {
				TargetName string `json:"targetName"`
			}
			if err := json.Unmarshal(msg.Payload, &payload); err != nil {
				log.Println("invalid submit_vote payload:", err)
				continue
			}
			room, exists := getConnRoom(conn)
			if !exists {
				continue
			}

			room.mu.Lock()
			// Check if the round is in the discussion phase before accepting votes
			if room.round == nil || room.round.Phase != string(PhaseVoting) {
				room.mu.Unlock()
				continue
			}

			// Find target conn by name
			var targetConn *websocket.Conn
			for c, name := range room.round.ActivePlayers {
				if name == payload.TargetName {
					targetConn = c
					break
				}
			}

			if targetConn == nil {
				room.mu.Unlock()
				_ = conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"payload": map[string]string{
						"message": "Target player not found",
					},
				})
				continue
			}
			// Only allow voting once
			if _, alreadyVoted := room.round.Votes[conn]; alreadyVoted {
				room.mu.Unlock()
				continue
			}

			room.round.Votes[conn] = targetConn
			room.mu.Unlock()

			broadcastVoteUpdate(room)
		case "lock_vote":
			room, exists := getConnRoom(conn)
			if !exists {
				continue
			}
			room.mu.Lock()
			// Check if the round is in the discussion phase before accepting vote locks
			if room.round == nil || room.round.Phase != string(PhaseVoting) {
				room.mu.Unlock() // Ignore if not in voting phase
				continue
			}

			// Must have voted before locking
			if _, hasVoted := room.round.Votes[conn]; !hasVoted {
				room.mu.Unlock()
				_ = conn.WriteJSON(map[string]interface{}{
					"type": "error",
					"payload": map[string]string{
						"message": "You must vote before locking",
					},
				})
				continue
			}

			room.round.VoteLocked[conn] = true

			// Check if all active players have locked
			allLocked := true
			for c := range room.round.ActivePlayers {
				if !room.round.VoteLocked[c] {
					allLocked = false
					break
				}
			}
			room.mu.Unlock()

			broadcastVoteUpdate(room)

			// don't broadcast results automatically — wait for host to trigger it
			if allLocked {
				room.mu.Lock()
				room.round.AllLocked = true
				room.mu.Unlock()
				broadcastVoteUpdate(room) // still broadcast so host sees the button enable
			}
		case "reveal_results":
			room, exists := getConnRoom(conn)
			if !exists {
				continue
			}

			room.mu.Lock()
			if room.host != conn {
				room.mu.Unlock()
				continue
			}
			if room.round == nil || !room.round.AllLocked {
				room.mu.Unlock()
				continue
			}

			if room.round.Phase != string(PhaseVoting) {
				room.mu.Unlock()
				continue
			}

			if !room.round.AllLocked {
				room.mu.Unlock()
				continue
			}

			// Prevent duplicate reveals
			room.round.Phase = string(PhaseResults)

			room.mu.Unlock()

			broadcastResults(room)

		case "skip_to_voting":
			room, exists := getConnRoom(conn)
			if !exists {
				continue
			}

			room.mu.Lock()
			// This if statement checks if the client is the host before allowing them to skip to voting, because only the host should have the power to skip phases
			if room.host != conn {
				room.mu.Unlock()
				continue
			}
			// This if statement checks if the round exists and is in the discussion phase before allowing the host to skip to voting, because if the round doesn't exist or isn't in the discussion phase, then it doesn't make sense to skip to voting
			if room.round == nil || room.round.Phase != string(PhaseDiscussion) {
				room.mu.Unlock()
				continue
			}
			room.round.Phase = string(PhaseVoting)
			room.mu.Unlock()

			broadcastPhaseChange(room, PhaseVoting)

		default:
			log.Println("Unknown message type:", msg.Type)
		}
	}
}
