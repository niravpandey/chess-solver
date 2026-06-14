import { GameState } from "./boardTypes";

function formatReason(reason: string) {
  return reason.replaceAll("_", " ");
}

export default function GameStateSummary({ game }: { game: GameState }) {
  const turn = game.turn === "white" ? "White" : "Black";

  if (game.outcome) {
    const resultLabel = game.outcome.winner
      ? `${game.outcome.winner === "white" ? "White" : "Black"} wins`
      : "Draw";

    return (
      <div className="mt-2 border border-neutral-700 bg-neutral-950 p-2 text-sm">
        <p className="font-semibold text-neutral-100">Game over</p>
        <p className="mt-1 text-neutral-300">
          {resultLabel} by {formatReason(game.outcome.reason)}
        </p>
        <p className="mt-1 font-mono text-xs text-neutral-500">
          Result: {game.outcome.result}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 border border-neutral-800 bg-neutral-950 p-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-neutral-400">Turn</span>
        <span className="font-medium text-neutral-100">{turn}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-neutral-400">Legal moves</span>
        <span className="font-mono text-neutral-100">
          {game.legal_move_count}
        </span>
      </div>
      {game.is_check && (
        <p className="mt-1 font-medium text-amber-300">{turn} is in check</p>
      )}
    </div>
  );
}
