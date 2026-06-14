import { useMathJax } from "@/hooks/useMathJax";
import { formatNumber } from "./boardFormat";
import { GameState, GameTotals, Opponent } from "./boardTypes";

type LastSearchStats = {
  root_branching_factor: number;
  average_branching_factor: number;
  nodes_generated: number;
  expanded_nodes: number;
} | null;

type SearchStatsPanelProps = {
  game: GameState;
  gameTotals: GameTotals;
  opponent: Opponent;
  settingsLocked: boolean;
  searchDepth: number;
  setSearchDepth: (searchDepth: number) => void;
};

export default function SearchStatsPanel({
  game,
  gameTotals,
  opponent,
  settingsLocked,
  searchDepth,
  setSearchDepth,
}: SearchStatsPanelProps) {
  const typesetMath = useMathJax([
    game.agent,
    gameTotals,
    opponent,
    searchDepth,
  ]);
  const lastSearchStats: LastSearchStats = game.agent
    ? {
        root_branching_factor: game.agent.root_branching_factor,
        average_branching_factor: game.agent.average_branching_factor,
        nodes_generated: game.agent.nodes_generated,
        expanded_nodes: game.agent.expanded_nodes,
      }
    : null;

  return (
    <details
      className="border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-300 shadow-xl"
      onToggle={typesetMath}
    >
      <summary className="cursor-pointer font-semibold text-neutral-100">
        Search stats
      </summary>
      <p className="mt-1 text-xs text-neutral-500">
        Plain minimax, no pruning.
      </p>

      <label className="mt-2 grid gap-1 text-sm text-neutral-300">
        <span className="flex items-center justify-between gap-3">
          <span>Search depth</span>
          <span className="font-mono text-neutral-100">{searchDepth}</span>
        </span>
        <input
          type="range"
          min="1"
          max="3"
          step="1"
          value={searchDepth}
          onChange={(event) => {
            const value = Number(event.target.value);
            setSearchDepth(Math.min(3, Math.max(1, value || 1)));
          }}
          disabled={opponent === "human" || settingsLocked}
          className="w-full accent-neutral-300 disabled:opacity-50"
        />
      </label>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="space-y-1 text-neutral-400">
          <p className="font-semibold text-neutral-200">Last agent search</p>
          <p>{`\\(b_{root}=${lastSearchStats?.root_branching_factor ?? 0}\\)`}</p>
          <p>
            {`\\(\\bar{b}=${formatNumber(lastSearchStats?.average_branching_factor ?? 0)}\\)`}
          </p>
          <p>{`\\(N_{generated}=${lastSearchStats?.nodes_generated ?? 0}\\)`}</p>
          <p>{`\\(N_{expanded}=${lastSearchStats?.expanded_nodes ?? 0}\\)`}</p>
        </div>

        <div className="space-y-1 text-neutral-300">
          <p className="font-semibold text-neutral-200">Game totals</p>
          <p>{`\\(A_{moves}=${gameTotals.agentMoves}\\)`}</p>
          <p>{`\\(N_{generated,total}=${gameTotals.nodesGenerated}\\)`}</p>
          <p>{`\\(N_{expanded,total}=${gameTotals.nodesExpanded}\\)`}</p>
        </div>
      </div>
    </details>
  );
}
