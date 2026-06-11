"use client";

import { create } from "zustand";
import { GameSettings } from "./gameSettings";

// ─── Types ────────────────────────────────────────────────────────────────────
type ConnectionStatus = "idle" | "connecting" | "connected" | "error"; // Tracks the state of the online lobby connection and interactions

type PendingAction = // Represents a pending action (creating or joining a lobby) that is waiting for a server response
  | {
      type: "create";
      resolve: (roomCode: string) => void;
      reject: (error: Error) => void;
    }
  | {
      type: "join";
      resolve: () => void;
      reject: (error: Error) => void;
    }
  | {
      type: "update_settings";
      resolve: () => void;
      reject: (error: Error) => void;
    }
  | null;

type OnlineResults = {
  voteTotals: Record<string, number>;
  leaderNames: string[];
  topVoteCount: number;
  playersWin: boolean;
  winningSide: string;
  outcomeMessage: string;
  imposterName: string;
  word: string;
};

// Zustand store for managing online lobby state and interactions
type OnlineLobbyState = {
  connectionStatus: ConnectionStatus;
  error: string | null;
  roomCode: string | null;
  players: string[];
  isHost: boolean;
  hostLeft: boolean;
  gameStarted: boolean;
  settings: GameSettings | null;
  createLobby: (name: string, settings: GameSettings) => Promise<string>;
  joinLobby: (name: string, roomCode: string) => Promise<void>;
  updateSettings: (settings: GameSettings) => Promise<void>;
  // Only the host can start the game, and it can only be started once
  startGame: () => Promise<void>;
  // leave lobby is initially void because it doesn't require server interaction, but it may become async in the future if we want to notify the server when a player leaves
  leaveLobby: () => void;
  clearError: () => void;
  leaveGame: () => void; // This is separate from leaveLobby because leaving the game after it has started might have different implications (like affecting game state, notifying other players, etc) compared to leaving the lobby before the game starts.

  // Fields needed for game to be playable after the lobby phase
  role: "imposter" | "innocent" | null;
  word: string | null;
  readinessReady: number;
  readinessTotal: number;
  phase: "lobby" | "reveal" | "discussion" | "voting" | "results" | null;
  startingPlayer: string | null;
  timerSeconds: number | null;
  sendRevealReady: () => void;
  sendRevealResults: () => void;
  voteLocked: number;
  voteTotal: number;
  voteTotals: Record<string, number>;
  allLocked: boolean;
  results: OnlineResults | null;
  sendVote: (targetName: string) => void;
  sendLockVote: () => void;
  sendSkipToVoting: () => void;
};

// ─── Socket module-level state ────────────────────────────────────────────────

let socket: WebSocket | null = null;
let socketOpenPromise: Promise<void> | null = null;
let socketOpenResolve: (() => void) | null = null;
let socketOpenReject: ((error: Error) => void) | null = null;
let pendingAction: PendingAction = null;
let disconnecting = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSocketUrl() {
  const baseUrl = new URL(process.env.NEXT_PUBLIC_WEB_TEST_URL!);
  baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
  baseUrl.pathname = "/ws";
  baseUrl.search = "";
  baseUrl.hash = "";
  return baseUrl.toString();
}

function normalizeLobbyMessage(errorMessage: string) {
  if (errorMessage === "Room not found") {
    return "Lobby not found";
  }
  return errorMessage;
}

function sendMessage(type: string, payload: Record<string, unknown>) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    throw new Error("Lobby connection is not ready");
  }

  socket.send(
    JSON.stringify({
      type,
      payload,
    })
  );
}

function rejectPending(error: Error) {
  if (!pendingAction) return;

  pendingAction.reject(error);
  pendingAction = null;
}

function parseLobbyState(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { players: [] };
  }

  const state = payload as {
    players?: unknown;
  };

  return {
    players: Array.isArray(state.players) ? (state.players as string[]) : [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCategory(value: unknown): GameSettings["category"] {
  if (!isRecord(value)) {
    return { type: "general" };
  }

  const type = value.type;
  if (type !== "general" && type !== "bowdoin" && type !== "custom") {
    return { type: "general" };
  }

  const category: GameSettings["category"] = { type };

  if (typeof value.prompt === "string") {
    category.prompt = value.prompt;
  }

  if (typeof value.word === "string") {
    category.word = value.word;
  }

  return category;
}

function parseGameSettings(value: unknown): GameSettings | null {
  if (!isRecord(value)) {
    return null;
  }

  const players = Array.isArray(value.players)
    ? value.players.filter((player): player is string => typeof player === "string")
    : [];

  const timerSeconds =
    typeof value.timerSeconds === "number" && Number.isFinite(value.timerSeconds) && value.timerSeconds > 0
      ? value.timerSeconds
      : 60;

  const infiniteTimer = typeof value.infiniteTimer === "boolean"
    ? value.infiniteTimer
    : false;

  const settings: GameSettings = {
    players,
    timerSeconds,
    infiniteTimer,
    imposterFirst: typeof value.imposterFirst === "boolean" ? value.imposterFirst : false,
    secretMode: typeof value.secretMode === "boolean" ? value.secretMode : false,
    category: parseCategory(value.category),
  };

  if (typeof value.clientId === "string") {
    settings.clientId = value.clientId;
  }

  return settings;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useOnlineLobbyStore = create<OnlineLobbyState>((set) => {
  // ── Socket setup ────────────────────────────────────────────────────────────────
  const ensureSocket = async () => { 
    if (socket && socket.readyState === WebSocket.OPEN) {
      return;
    }

    if (socket && socket.readyState === WebSocket.CONNECTING && socketOpenPromise) {
      return socketOpenPromise;
    }

    socket = new WebSocket(getSocketUrl());
    set({ connectionStatus: "connecting", error: null });

    // We store the resolve and reject functions of the promise so that we can call them from the WebSocket event handlers when the connection is established or fails
    socketOpenPromise = new Promise<void>((resolve, reject) => {
      socketOpenResolve = resolve;
      socketOpenReject = reject;
    });

    // Socket.onopen means that the connection to the server has been established, but it doesn't necessarily mean that we've successfully created or joined a lobby yet. We only consider the lobby connection fully successful when we receive the appropriate messages from the server (like "room_created" or "players_update"), which is when we resolve the pending actions for creating or joining a lobby.
    socket.onopen = () => {
      set({ connectionStatus: "connected" });
      socketOpenResolve?.(); // When this runs, it will resolve the promise returned by ensureSocket, allowing the createLobby or joinLobby functions to proceed with sending their messages to the server.
      socketOpenResolve = null;
      socketOpenReject = null;
    };

    // Socket.onmessage is basically a one stop shop for handling all the different types of messages that the server can send related to lobby state (like updates to the player list, role assignments, errors, etc). Depending on the message type, we update the Zustand store accordingly and also resolve or reject any pending actions that are waiting for a server response.
    socket.onmessage = handleMessage;  
    socket.onerror = handleError;      
    socket.onclose = handleClose;      

    return socketOpenPromise;
  };

  const disconnect = () => {
    disconnecting = true;
    rejectPending(new Error("Lobby disconnected"));

    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close();
    }

    socket = null;
    socketOpenPromise = null;
    socketOpenResolve = null;
    socketOpenReject = null;
    pendingAction = null;

    set({
      connectionStatus: "idle",
      error: null,
      roomCode: null,
      players: [],
      isHost: false,
      gameStarted: false,
      settings: null,
      hostLeft: false,
      role: null,
      word: null,
      readinessReady: 0,
      readinessTotal: 0,
      phase: null,
      startingPlayer: null,
      timerSeconds: null,
      voteLocked: 0,
      voteTotal: 0,
      voteTotals: {},
      allLocked: false,
      results: null,
    });
  };

  const handleMessage = (event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data as string) as {
        type?: string;
        payload?: unknown;
      };

      switch (message.type) {
        case "room_created": {
          const roomCode = (message.payload as { room?: string } | undefined)?.room;
          if (!roomCode) return;

          set({
            roomCode,
            error: null,
            connectionStatus: "connected",
          });

          if (pendingAction?.type === "create") { // This completes the promise of await createLobby(...) in the UI, allowing it to transition to the lobby screen with the new room code. If there's an error during lobby creation, we would have received an "error" message instead, which would reject the promise and display the error message in the UI.
            pendingAction.resolve(roomCode);
            pendingAction = null;
          }
          break;
        }

        case "players_update": {
          const { players } = parseLobbyState(message.payload);

          set({
            players,
            error: null,
            connectionStatus: "connected",
          });

          if (pendingAction?.type === "join" || pendingAction?.type === "update_settings") {
            pendingAction.resolve();
            pendingAction = null;
          }
          break;
        }

        case "settings_update": {
          const settings = (message.payload as { settings?: unknown } | undefined)?.settings;
          const parsedSettings = parseGameSettings(settings);

          if (parsedSettings) {
            set({
              settings: parsedSettings,
              error: null,
              connectionStatus: "connected",
            });

            if (pendingAction?.type === "update_settings") {
              pendingAction.resolve();
              pendingAction = null;
            }
          }
          break;
        }

        case "role": {
          const p = message.payload as { role?: string; word?: string };
          set({
            gameStarted: true,
            phase: "reveal",
            role: (p.role as "imposter" | "innocent") ?? null,
            word: p.word ?? null,
            error: null,
            connectionStatus: "connected",

          });
          break;
        }

        case "readiness_update": {
          const p = message.payload as { ready?: number; total?: number };
          set({
            readinessReady: p.ready ?? 0,
            readinessTotal: p.total ?? 0,
          });
          break;
        }

        case "phase_change": {
          const p = message.payload as {
            phase?: string;
            startingPlayer?: string;
            timerSeconds?: number;
            isHost?: boolean;
          };
          set({
            phase: (p.phase as "discussion") ?? null,
            startingPlayer: p.startingPlayer ?? null,
            timerSeconds: p.timerSeconds ?? null,
          });
          break;
        }

        case "error": {
          const rawMessage = (message.payload as { message?: string } | undefined)?.message;
          const errorMessage = normalizeLobbyMessage(rawMessage || "Something went wrong");

          set({
            error: errorMessage,
            connectionStatus: "error",
          });

          rejectPending(new Error(errorMessage));
          break;
        }
        case "host_left": {
          disconnect();
          set({ hostLeft: true, connectionStatus: "idle" });
          break;
        }
        case "vote_update": {
          const p = message.payload as {
            locked?: number;
            total?: number;
            voteTotals?: Record<string, number>;
            allLocked?: boolean;
          };
          set({
            voteLocked: p.locked ?? 0,
            voteTotal: p.total ?? 0,
            voteTotals: p.voteTotals ?? {},
            allLocked: p.allLocked ?? false,
          });
          break;
        }

        case "results": {
          const p = message.payload as OnlineResults;
          set({
            phase: "results",
            results: p,
          });
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.error("Failed to parse lobby message:", error);
    }
  }
  const handleError = () => {
    const error = new Error("Unable to connect to the lobby server");
    set({ error: error.message, connectionStatus: "error"});
    socketOpenReject?.(error);
    socketOpenResolve = null;
    socketOpenReject = null;
    rejectPending(error);
  }

  const handleClose = () => {
    console.log("SOCKET CLOSED");
    socket = null;
    socketOpenPromise = null;
    socketOpenResolve = null;
    socketOpenReject = null;
    if (!disconnecting) rejectPending(new Error("Lobby disconnected"));
    if (!disconnecting) set({ connectionStatus: "idle" });
    disconnecting = false;
  };
  // ── Return ────────────────────────────────────────────────────────
  return {
    connectionStatus: "idle",
    error: null,
    roomCode: null,
    players: [],
    isHost: false,
    hostLeft: false,
    gameStarted: false,
    settings: null,
    // Additional fields needed for game to be playable after the lobby phase
    role: null,
    word: null,
    readinessReady: 0,
    readinessTotal: 0,
    phase: null,
    startingPlayer: null,
    timerSeconds: null,
    leaveGame: disconnect,
    clearError: () => set({ error: null }),
    leaveLobby: disconnect,
    voteLocked: 0,
    voteTotal: 0,
    voteTotals: {},
    allLocked: false,
    results: null,
    sendRevealReady: () => sendMessage("reveal_ready", {}),
    sendRevealResults: () => sendMessage("reveal_results", {}),
    createLobby: async (name, settings) => {
      // Ensures the socket is connected before attempting to create a lobby and sets up the pending action to handle the server response
      await ensureSocket();

      // When room_created arrives from the server, it will resolve this promise with the new room code, allowing the UI to transition to the lobby screen. If there's an error during lobby creation, it will reject the promise and display the error message in the UI.
      return new Promise<string>((resolve, reject) => {
        pendingAction = {
          type: "create",
          resolve,
          reject,
        };

        // Setting the initial lobby settings before sending the create_room message allows the UI to optimistically reflect the lobby state (like showing the host's name and selected settings) while waiting for the server response. If the server responds with an error, we can then clear or adjust this state accordingly.
        set({
          error: null,
          isHost: true,
          gameStarted: false,
          settings,
          players: [name],
          roomCode: null,
          connectionStatus: "connected",
        });

        // This message actually tells the server to create the lobby. The server will then respond with a "room_created" message containing the room code, which is when we consider the lobby creation successful and resolve the pending action. If the server responds with an error message instead, we reject the pending action and update the UI with the error.
        try {
          sendMessage("create_room", {
            name,
            settings,
          });
        } catch (error) {
          pendingAction = null;
          reject(error instanceof Error ? error : new Error("Failed to create lobby"));
        }
      });
    },
    joinLobby: async (name, roomCode) => {
      // Ensures the socket is connected before attempting to create a lobby and sets up the pending action to handle the server response
      await ensureSocket();

      // When players_update arrives from the server with the updated player list (which includes the new player), it will resolve this promise, allowing the UI to transition to the lobby screen. If there's an error during joining (like invalid room code, lobby full, etc), it will reject the promise and display the error message in the UI.
      return new Promise<void>((resolve, reject) => {
        pendingAction = {
          type: "join",
          resolve,
          reject,
        };

        set({
          error: null,
          isHost: false,
          gameStarted: false,
          settings: null,
          players: [name],
          roomCode,
          connectionStatus: "connected",
        });

        // This message tells the server that we want to join the specified lobby. The server will then respond with a "players_update" message containing the updated player list if the join is successful, which is when we consider the lobby join successful and resolve the pending action. If the server responds with an error message instead (like "Lobby not found" or "Lobby full"), we reject the pending action and update the UI with the error.
        try {
          sendMessage("join_room", {
            name,
            room: roomCode,
          });
        } catch (error) {
          pendingAction = null;
          reject(error instanceof Error ? error : new Error("Failed to join lobby"));
        }
      });
    },
    updateSettings: async (settings) => {
      await ensureSocket();

      return new Promise<void>((resolve, reject) => {
        pendingAction = {
          type: "update_settings",
          resolve,
          reject,
        };

        try {
          console.log("SENDING UPDATE SETTINGS:", settings);

          sendMessage("update_settings", {
            settings,
          });
        } catch (error) {
          pendingAction = null;
          reject(error instanceof Error ? error : new Error("Failed to update settings"));
        }
      });
    },
    sendVote: (targetName: string) => sendMessage("submit_vote", { targetName }),
    sendLockVote: () => sendMessage("lock_vote", {}),
    sendSkipToVoting: () => sendMessage("skip_to_voting", {}),
    startGame: async () => {
      await ensureSocket();
      sendMessage("start_game", {});
    },
  };
});
