import { GameState } from "./gameSettings";

export type GameOutcome = {
  voteTotals: Record<string, number>;
  topVoteCount: number;
  leaders: GameState["players"];
  imposters: GameState["players"];
  playersWin: boolean;
  outcomeTitle: string;
  outcomeBody: string;
};

function getVoteTotals(game: GameState): Record<string, number> {
  const totals = Object.fromEntries(
    game.players.map((player) => [player.id, 0]),
  ) as Record<string, number>;

  for (const vote of game.voteState.votes) {
    if (vote.targetPlayerId in totals) {
      totals[vote.targetPlayerId] += 1;
    }
  }

  return totals;
}

export function getGameOutcome(game: GameState): GameOutcome {
  if (game.results) {
    const leaderSet = new Set(game.results.leaderIds);
    const leaders = game.players.filter((player) => leaderSet.has(player.id));
    const imposters = game.players.filter((player) => player.role === "imposter");

    return {
      voteTotals: game.results.voteTotals,
      topVoteCount: game.results.topVoteCount,
      leaders,
      imposters,
      playersWin: game.results.playersWin,
      outcomeTitle: game.results.playersWin ? "Players Win" : "Imposter Wins",
      outcomeBody: game.results.outcomeMessage,
    };
  }

  const voteTotals = getVoteTotals(game);
  const topVoteCount = Math.max(0, ...Object.values(voteTotals));
  const leaders = game.players.filter(
    (player) => (voteTotals[player.id] ?? 0) === topVoteCount && topVoteCount > 0,
  );
  const imposters = game.players.filter((player) => player.role === "imposter");
  const playersWin = leaders.length === 1 && leaders[0]?.role === "imposter";
  const outcomeTitle = playersWin ? "Players Win" : "Imposter Wins";
  const outcomeBody = playersWin
    ? `${leaders[0]?.name} was correctly identified as the imposter.`
    : leaders.length > 1
      ? "The vote ended in a tie, so the imposter wins."
      : "The players failed to identify the imposter.";

  return {
    voteTotals,
    topVoteCount,
    leaders,
    imposters,
    playersWin,
    outcomeTitle,
    outcomeBody,
  };
}
