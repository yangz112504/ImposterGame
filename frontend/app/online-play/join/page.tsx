"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useOnlineLobbyStore } from "@/lib/onlineLobbyStore";

const ROOM_CODE_LENGTH = 8;

export default function JoinLobbyPage() {
  const router = useRouter();
  const joinLobby = useOnlineLobbyStore((state) => state.joinLobby);
  const error = useOnlineLobbyStore((state) => state.error);
  const connectionStatus = useOnlineLobbyStore((state) => state.connectionStatus);
  const clearError = useOnlineLobbyStore((state) => state.clearError);

  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const normalizedCode = useMemo(
    () => roomCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH),
    [roomCode]
  );
  const canJoin =
    displayName.trim().length > 0 &&
    normalizedCode.length === ROOM_CODE_LENGTH &&
    !isJoining;

  useEffect(() => {
    clearError();
  }, [clearError]);

  async function handleJoin() {
    if (!canJoin) return;

    setIsJoining(true);
    clearError();

    try {
      // Expects a promise that resolves when we've successfully joined the lobby (which happens when we receive the appropriate messages from the server confirming that we've joined). If there's an error during joining (like invalid room code, lobby full, etc), it will throw and be caught in the catch block, allowing us to display the error message in the UI.
      await joinLobby(displayName.trim(), normalizedCode);
      router.push(`/online-play/${normalizedCode}`);
    } catch (joinError) {
      console.error(joinError);
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-white">
      <Link
        href="/online-play"
        className="mb-8 self-start text-[0.8rem] font-semibold tracking-widest text-purple-200/55 transition-colors duration-150 hover:text-purple-200/90"
      >
        <span className="mr-1 text-base leading-none">‹</span>
        Back
      </Link>

      <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-purple-200/55">
        Online Play
      </p>
      <h1 className="mb-2 font-['Sora'] text-[2.3rem] font-extrabold leading-none tracking-tight text-white">
        Join a Lobby
      </h1>
      <p className="mb-10 text-center text-sm font-medium tracking-widest text-purple-200/65">
        Enter your name and the 8-character room code
      </p>

      <div className="w-full max-w-md rounded-[24px] bg-white/10 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-purple-100/70">
              Display name
            </span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-2xl border border-purple-200/20 bg-white/10 px-4 py-3 text-white placeholder:text-purple-100/35 focus:border-purple-300 focus:outline-none"
              autoComplete="name"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-purple-100/70">
              Room code
            </span>
            <input
              value={roomCode}
              onChange={(e) =>
                setRoomCode(
                  e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH)
                )
              }
              placeholder="AB12CD34"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={ROOM_CODE_LENGTH}
              className="w-full rounded-2xl border border-purple-200/20 bg-white/10 px-4 py-3 font-['Sora'] text-lg font-bold tracking-[0.22em] text-white placeholder:text-purple-100/35 focus:border-purple-300 focus:outline-none"
              autoComplete="off"
            />
          </label>

          <button
            onClick={handleJoin}
            disabled={!canJoin || connectionStatus === "connecting"}
            className="w-full rounded-2xl bg-purple-600 px-4 py-3 font-['Sora'] text-sm font-bold uppercase tracking-[0.2em] text-white transition-all duration-150 hover:enabled:bg-purple-700 active:enabled:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isJoining || connectionStatus === "connecting" ? "Joining..." : "Join Lobby"}
          </button>

          {error && (
            <p className="text-center text-sm font-medium text-red-200">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
