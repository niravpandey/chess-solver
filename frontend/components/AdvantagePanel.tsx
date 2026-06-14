import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EvalPoint } from "./boardTypes";
import { formatNumber } from "./boardFormat";

type AdvantagePanelProps = {
  evalHistory: EvalPoint[];
};

export default function AdvantagePanel({ evalHistory }: AdvantagePanelProps) {
  const currentAdvantage = evalHistory.at(-1)?.advantage ?? 0;
  const advantageLabel =
    currentAdvantage > 0
      ? `Human +${formatNumber(currentAdvantage)}`
      : currentAdvantage < 0
        ? `Agent +${formatNumber(Math.abs(currentAdvantage))}`
        : "Equal";

  return (
    <div className="mt-3 border-t border-neutral-800 pt-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-neutral-100">Advantage</p>
        <p className="font-mono text-sm text-neutral-300">{advantageLabel}</p>
      </div>
      <p className="mt-0.5 text-xs text-neutral-500">
        Positive means human/white is ahead; negative means agent/black is ahead.
      </p>
      <div className="mt-2 overflow-x-auto">
        {evalHistory.length > 0 ? (
          <LineChart
            width={320}
            height={120}
            data={evalHistory}
            margin={{ top: 6, right: 10, left: -18, bottom: 0 }}
          >
            <CartesianGrid stroke="#262626" />
            <XAxis
              dataKey="ply"
              stroke="#a3a3a3"
              tick={{ fill: "#a3a3a3", fontSize: 12 }}
            />
            <YAxis
              stroke="#a3a3a3"
              tick={{ fill: "#a3a3a3", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid #404040",
                color: "#e5e5e5",
              }}
            />
            <ReferenceLine y={0} stroke="#525252" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="advantage"
              name="Human advantage"
              stroke="#e5e5e5"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        ) : (
          <div className="grid h-24 place-items-center border border-neutral-800 text-sm text-neutral-500">
            Select minimax to start plotting evaluations.
          </div>
        )}
      </div>
    </div>
  );
}
