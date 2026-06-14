import { useMathJax } from "@/hooks/useMathJax";
import { formatNumber, signedWeightTerm } from "./boardFormat";

type HeuristicsPanelProps = {
  mobilityWeight: number;
  pieceWeight: number;
  materialWeight: number;
  centerWeight: number;
  settingsLocked: boolean;
  setMobilityWeight: (weight: number) => void;
  setPieceWeight: (weight: number) => void;
  setMaterialWeight: (weight: number) => void;
  setCenterWeight: (weight: number) => void;
};

type HeuristicWeightControlProps = {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
};

function HeuristicWeightControl({
  label,
  value,
  disabled,
  onChange,
}: HeuristicWeightControlProps) {
  return (
    <label className="mt-1.5 grid gap-1 text-sm text-neutral-300">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="font-mono text-neutral-100">
          {formatNumber(value)}
        </span>
      </span>
      <input
        type="range"
        min="-10"
        max="10"
        step="0.1"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-neutral-300 disabled:opacity-50"
      />
    </label>
  );
}

export default function HeuristicsPanel({
  mobilityWeight,
  pieceWeight,
  materialWeight,
  centerWeight,
  settingsLocked,
  setMobilityWeight,
  setPieceWeight,
  setMaterialWeight,
  setCenterWeight,
}: HeuristicsPanelProps) {
  const typesetMath = useMathJax([
    mobilityWeight,
    pieceWeight,
    materialWeight,
    centerWeight,
  ]);
  const heuristicFormula = `\\[
    h(s)=${formatNumber(mobilityWeight)}h_1(s) ${signedWeightTerm(pieceWeight, "h_2")} ${signedWeightTerm(materialWeight, "h_3")} ${signedWeightTerm(centerWeight, "h_4")}
  \\]`;

  return (
    <details
      className="border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-300 shadow-xl"
      onToggle={typesetMath}
    >
      <summary className="cursor-pointer font-semibold text-neutral-100">
        Heuristics
      </summary>

      <div className="mt-2 overflow-x-auto text-neutral-300">
        <p>{heuristicFormula}</p>
      </div>

      <div className="mt-3">
        <p className="font-semibold text-neutral-200">h1: Mobility</p>
        <p>{`\\[h_1(s)=M_{agent}(s)-M_{opp}(s)\\]`}</p>
        <HeuristicWeightControl
          label="Mobility weight"
          value={mobilityWeight}
          disabled={settingsLocked}
          onChange={setMobilityWeight}
        />
      </div>

      <div className="mt-3">
        <p className="font-semibold text-neutral-200">h2: Piece count</p>
        <p>{`\\[h_2(s)=P_{agent}(s)-P_{opp}(s)\\]`}</p>
        <HeuristicWeightControl
          label="Piece-count weight"
          value={pieceWeight}
          disabled={settingsLocked}
          onChange={setPieceWeight}
        />
      </div>

      <div className="mt-3">
        <p className="font-semibold text-neutral-200">h3: Material</p>
        <p>{`\\[h_3(s)=V_{agent}(s)-V_{opp}(s)\\]`}</p>
        <p className="text-xs text-neutral-500">
          Pawn 1, knight 3, bishop 3, rook 5, queen 9, king 0.
        </p>
        <HeuristicWeightControl
          label="Material weight"
          value={materialWeight}
          disabled={settingsLocked}
          onChange={setMaterialWeight}
        />
      </div>

      <div className="mt-3">
        <p className="font-semibold text-neutral-200">h4: Center control</p>
        <p>{`\\[h_4(s)=C_{agent}(s)-C_{opp}(s)\\]`}</p>
        <p className="text-xs text-neutral-500">
          Counts occupying or attacking d4, e4, d5, and e5.
        </p>
        <HeuristicWeightControl
          label="Center-control weight"
          value={centerWeight}
          disabled={settingsLocked}
          onChange={setCenterWeight}
        />
      </div>
    </details>
  );
}
