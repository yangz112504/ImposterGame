"use client";

type PlayerResult = {
  id: string;
  name: string;
  votes: number;
  isImposter: boolean;
  isLeader: boolean;
};

type ResultsViewProps = {
  outcomeTitle: string;
  outcomeBody: string;
  playersWin: boolean;
  imposterNames: string[];
  players: PlayerResult[];
  topVoteCount: number;
  summaryLine: string;
  onBackToSetup: () => void;
  backLabel?: string;
};

export default function ResultsView({
  outcomeTitle,
  outcomeBody,
  playersWin,
  imposterNames,
  players,
  summaryLine,
  onBackToSetup,
  backLabel = "New Game",
}: ResultsViewProps) {
  const sorted = [...players].sort((a, b) => b.votes - a.votes);

  return (
    <div className="
      font-homepage
      flex min-h-svh w-full flex-col
      md:min-h-screen md:items-center md:justify-center md:p-8
    ">
      <div className="
        flex w-full flex-1 flex-col
        md:flex-initial md:w-full md:max-w-lg md:rounded-[28px]
        md:border md:border-white/10 md:bg-white/[0.06]
        md:p-8 md:backdrop-blur-2xl
        md:shadow-[0_20px_60px_rgba(0,0,0,0.5)]
      ">
        {/* Header */}
        <div className="flex-none px-5 pb-4 pt-10 text-center md:px-0 md:pt-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-purple-200/50">
            Voting Complete
          </p>
          <h1 className="mt-2 text-4xl font-extrabold text-white leading-tight">
            {outcomeTitle}
          </h1>

          <div className={`
            mt-4 rounded-2xl border px-4 py-3
            ${playersWin
              ? "border-emerald-400/30 bg-emerald-500/15"
              : "border-red-400/30 bg-red-500/15"
            }
          `}>
            <p className={`text-sm font-semibold leading-snug ${playersWin ? "text-emerald-200" : "text-red-200"}`}>
              {outcomeBody}
            </p>
            <p className={`mt-1 text-xs ${playersWin ? "text-emerald-300/60" : "text-red-300/60"}`}>
              Imposter{imposterNames.length === 1 ? "" : "s"}:{" "}
              <span className="font-semibold">
                {imposterNames.join(", ") || "None"}
              </span>
            </p>
          </div>
        </div>

        {/* Vote results */}
        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-2 md:px-0">
          {sorted.map((player, index) => {
            const isTopSpot = index === 0 && player.votes > 0;

            return (
              <div
                key={player.id}
                className={`
                  relative overflow-hidden rounded-2xl border px-4 py-3.5
                  flex items-center justify-between gap-3
                  ${player.isImposter
                    ? playersWin
                      ? "border-emerald-400/35 bg-emerald-500/15"
                      : "border-red-400/35 bg-red-500/18"
                    : "border-white/10 bg-white/[0.05]"
                  }
                `}
              >
                <span className="flex-none w-5 text-center text-xs font-bold text-white/25">
                  {index + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white truncate">{player.name}</span>
                    {player.isImposter && (
                      <span className={`
                        flex-none rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider
                        ${playersWin
                          ? "bg-emerald-400/20 text-emerald-300"
                          : "bg-red-400/20 text-red-300"
                        }
                      `}>
                        Imposter
                      </span>
                    )}
                  </div>
                  {player.isImposter && (
                    <p className={`text-[0.68rem] mt-0.5 font-medium ${playersWin ? "text-emerald-300/70" : "text-red-300/70"}`}>
                      {playersWin ? "Correctly identified" : "Escaped detection"}
                    </p>
                  )}
                </div>

                <div className="flex-none flex items-center gap-2">
                  {player.isLeader && player.votes > 0 && (
                    <span className="text-[0.6rem] font-bold uppercase tracking-wider text-amber-300/80">
                      Most votes
                    </span>
                  )}
                  <span className={`
                    text-2xl font-extrabold min-w-[2rem] text-right
                    ${isTopSpot ? "text-white" : "text-white/40"}
                  `}>
                    {player.votes}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex-none px-5 pb-10 pt-4 md:px-0 md:pb-0">
          <div className="mb-4 border-t border-white/10 px-1 pt-4 text-center">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/35">
              Vote Summary
            </p>
            <p className="mt-2 text-sm font-semibold text-white/72">{summaryLine}</p>
          </div>

          <button
            type="button"
            onClick={onBackToSetup}
            className="w-full rounded-2xl bg-white px-4 py-4 text-base font-extrabold text-purple-950 shadow-[0_8px_28px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 active:scale-95"
          >
            {backLabel}
          </button>
        </div>
      </div>
    </div>
  );
}