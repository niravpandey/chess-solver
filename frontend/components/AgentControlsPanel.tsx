import HeuristicsPanel from "./HeuristicsPanel";
import SearchStatsPanel from "./SearchStatsPanel";
import { GameState, GameTotals, Opponent } from "./boardTypes";

type AgentControlsPanelProps = {
  game: GameState;
  gameTotals: GameTotals;
  opponent: Opponent;
  settingsLocked: boolean;
  searchDepth: number;
  setSearchDepth: (searchDepth: number) => void;
  mobilityWeight: number;
  pieceWeight: number;
  materialWeight: number;
  centerWeight: number;
  setMobilityWeight: (weight: number) => void;
  setPieceWeight: (weight: number) => void;
  setMaterialWeight: (weight: number) => void;
  setCenterWeight: (weight: number) => void;
};

export default function AgentControlsPanel({
  game,
  gameTotals,
  opponent,
  settingsLocked,
  searchDepth,
  setSearchDepth,
  mobilityWeight,
  pieceWeight,
  materialWeight,
  centerWeight,
  setMobilityWeight,
  setPieceWeight,
  setMaterialWeight,
  setCenterWeight,
}: AgentControlsPanelProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <SearchStatsPanel
        game={game}
        gameTotals={gameTotals}
        opponent={opponent}
        settingsLocked={settingsLocked}
        searchDepth={searchDepth}
        setSearchDepth={setSearchDepth}
      />

      <HeuristicsPanel
        mobilityWeight={mobilityWeight}
        pieceWeight={pieceWeight}
        materialWeight={materialWeight}
        centerWeight={centerWeight}
        settingsLocked={settingsLocked}
        setMobilityWeight={setMobilityWeight}
        setPieceWeight={setPieceWeight}
        setMaterialWeight={setMaterialWeight}
        setCenterWeight={setCenterWeight}
      />
    </div>
  );
}
