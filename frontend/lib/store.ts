import { create } from "zustand";
import { GameSettings, GameState } from "./gameSettings";

type GameStore = {
  settings: GameSettings | null;
  setSettings: (s: GameSettings) => void;
  game: GameState | null;
  setGame: (g: GameState) => void;
  clearGame: () => void;
  updateGame: (updater: (game: GameState) => GameState) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  settings: null,
  setSettings: (s) => set({ settings: s }),
  game: null,
  setGame: (g) => set({ game: g }),
  clearGame: () => set({ game: null }),
  updateGame: (updater) =>
    set((state) => ({
      game: state.game ? updater(state.game) : null,
    })),
}));
