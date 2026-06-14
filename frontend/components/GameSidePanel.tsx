import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFlag,
  faPlay,
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons";
import AdvantagePanel from "./AdvantagePanel";
import GameStateSummary from "./GameStateSummary";
import { EvalPoint, GameState, Opponent } from "./boardTypes";

type GameSidePanelProps = {
  game: GameState;
  status: string;
  isAgentThinking: boolean;
  isStartingGame: boolean;
  hasSession: boolean;
  settingsLocked: boolean;
  sessionId: string | null;
  onStartGame: () => void;
  onResignGame: () => void;
  opponent: Opponent;
  setOpponent: (opponent: Opponent) => void;
  evalHistory: EvalPoint[];
};

export default function GameSidePanel({
  game,
  status,
  isAgentThinking,
  isStartingGame,
  hasSession,
  settingsLocked,
  sessionId,
  onStartGame,
  onResignGame,
  opponent,
  setOpponent,
  evalHistory,
}: GameSidePanelProps) {
  return (
    <div className="bg-neutral-900 p-3 shadow-xl border border-neutral-800">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Match</h2>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onStartGame}
            disabled={isStartingGame || isAgentThinking}
            aria-label={hasSession ? "Start new game" : "Start game"}
            title={hasSession ? "Start new game" : "Start game"}
            className="grid size-8 place-items-center border border-neutral-700 bg-neutral-100 text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FontAwesomeIcon icon={hasSession ? faRotateRight : faPlay} />
          </button>
          <button
            type="button"
            onClick={onResignGame}
            disabled={!hasSession || game.is_game_over || isStartingGame}
            aria-label="Resign game"
            title="Resign game"
            className="grid size-8 place-items-center border border-red-900/70 bg-red-950 text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faFlag} />
          </button>
        </div>
      </div>
      <div className="flex min-h-5 items-center gap-2 text-sm text-neutral-300">
        {(isAgentThinking || isStartingGame) && (
          <span className="h-4 w-4 rounded-full border-2 border-neutral-500 border-t-neutral-100 animate-spin" />
        )}
        <span>{status}</span>
      </div>
      {sessionId && (
        <p className="mt-2 truncate font-mono text-xs text-neutral-500">
          Session: {sessionId}
        </p>
      )}

      {hasSession && <GameStateSummary game={game} />}

      <label className="mt-3 grid gap-1 text-sm text-neutral-300">
        Opponent
        <select
          value={opponent}
          onChange={(event) => setOpponent(event.target.value as Opponent)}
          disabled={settingsLocked}
          className="border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-neutral-100 disabled:opacity-50"
        >
          <option value="human">Human</option>
          <option value="minimax">Minimax</option>
        </select>
      </label>

      <AdvantagePanel evalHistory={evalHistory} />

      {game.agent && (
        <p className="mt-3 text-sm text-neutral-400">
          Last agent score: {game.agent.score.toFixed(2)}
        </p>
      )}
    </div>
  );
}
