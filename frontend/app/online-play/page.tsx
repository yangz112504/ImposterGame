"use client";

import Link from "next/link";

export default function OnlinePlay() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-white">
      <Link
        href="/"
        className="mb-8 self-start text-[0.8rem] font-semibold tracking-widest text-purple-200/55 transition-colors duration-150 hover:text-purple-200/90"
      >
        <span className="mr-1 text-base leading-none">‹</span>
        Back
      </Link>

      <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-purple-200/55">
        Online Play
      </p>
      <h1
        className="mb-2 font-['Sora'] text-[3rem] font-extrabold leading-none tracking-tight text-white"
        style={{ textShadow: "0 0 60px rgba(216,180,254,0.35)" }}
      >
        Join or Host
      </h1>
      <p className="mb-12 text-base font-medium tracking-widest text-purple-200/65">
        Create a lobby or join an existing one
      </p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/online-play/join"
          className="
            flex w-full items-center gap-4 rounded-[18px] bg-[#f0e6ff] px-5 py-[1.1rem]
            text-left shadow-[0_4px_24px_rgba(0,0,0,0.45)]
            transition-all duration-150 hover:-translate-y-0.5 hover:brightness-95 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
            active:scale-[0.97]
          "
        >
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-purple-100 text-xl">
            🔑
          </span>
          <div className="flex-1">
            <p className="font-['Sora'] text-[0.95rem] font-bold text-purple-950">
              Join a Lobby
            </p>
            <p className="mt-0.5 text-[0.75rem] font-medium text-purple-900/60">
              Enter a 6-digit code
            </p>
          </div>
          <span className="text-lg text-purple-950/40">›</span>
        </Link>

        <Link
          href="/online-play/create"
          className="
            flex w-full items-center gap-4 rounded-[18px] bg-[#f0e6ff] px-5 py-[1.1rem]
            text-left shadow-[0_4px_24px_rgba(0,0,0,0.45)]
            transition-all duration-150 hover:-translate-y-0.5 hover:brightness-95 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
            active:scale-[0.97]
          "
        >
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-purple-100 text-xl">
            ✨
          </span>
          <div className="flex-1">
            <p className="font-['Sora'] text-[0.95rem] font-bold text-purple-950">
              Create a Lobby
            </p>
            <p className="mt-0.5 text-[0.75rem] font-medium text-purple-900/60">
              Set up a room and invite friends
            </p>
          </div>
          <span className="text-lg text-purple-950/40">›</span>
        </Link>
      </div>
    </div>
  );
}
