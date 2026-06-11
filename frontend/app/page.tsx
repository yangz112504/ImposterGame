import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 text-white">

      {/* Hero */}
      <p className="text-[0.7rem] font-semibold tracking-[0.22em] uppercase text-purple-200/55 mb-3">
        A Social Deduction Game
      </p>
      <h1 className="font-['Sora'] text-[4rem] font-extrabold leading-none tracking-tight text-white mb-2"
        style={{ textShadow: "0 0 60px rgba(216,180,254,0.35)" }}>
        Imposter
      </h1>
      <p className="text-base font-medium tracking-widest text-purple-200/65 mb-12">
        Who&apos;s faking it?
      </p>

      {/* Mode cards */}
      <div className="flex flex-col w-full max-w-xs gap-3 mb-10">

        {/* Local — solid white */}
        <Link href="/local-play" className="
          w-full flex items-center gap-4 px-5 py-[1.1rem] rounded-[18px] text-left
          bg-white shadow-[0_4px_24px_rgba(0,0,0,0.45)]
          hover:brightness-95 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
          active:scale-[0.97] transition-all duration-150
        ">
          <span className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center text-xl flex-shrink-0">
            📱
          </span>
          <div className="flex-1">
            <p className="font-['Sora'] text-[0.95rem] font-bold text-purple-950">Local Play</p>
            <p className="text-[0.75rem] font-medium text-purple-900/60 mt-0.5">Play on one device</p>
          </div>
          <span className="text-purple-950/40 text-lg">›</span>
        </Link>

        {/* Online — white border glass */}
        <Link href="/online-play" className="
            w-full flex items-center gap-4 px-5 py-[1.1rem] rounded-[18px] text-left
            bg-[#f0e6ff] shadow-[0_4px_24px_rgba(0,0,0,0.45)]
            hover:brightness-95 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
            active:scale-[0.97] transition-all duration-150
          ">
            <span className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center text-xl flex-shrink-0">
              🛜
            </span>
            <div className="flex-1">
              <p className="font-['Sora'] text-[0.95rem] font-bold text-purple-950">Online Play</p>
              <p className="text-[0.75rem] font-medium text-purple-900/60 mt-0.5">Play with friends remotely</p>
            </div>
            <span className="text-purple-950/40 text-lg">›</span>
        </Link>
      </div>

      {/* How to play */}
      <Link href="/how-to-play">
        <span className="text-[0.85rem] font-semibold tracking-widest text-purple-200/65
          border-b border-purple-200/25 pb-px
          hover:text-purple-200/95 hover:border-purple-200/6
          transition-all duration-150 cursor-pointer">
          How to Play
        </span>
      </Link>
    </div>
  );
}
