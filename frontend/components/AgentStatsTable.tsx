"use client";

import { useEffect, useState } from "react";
import {
  getChessStats,
  type ChessStats,
  type DashboardRange,
} from "@/lib/chessSessions";
import { formatNumber } from "./boardFormat";

const ranges: Array<{ label: string; value: DashboardRange }> = [
  { label: "Today", value: "today" },
  { label: "Week", value: "7d" },
  { label: "Month", value: "30d" },
  { label: "Year", value: "365d" },
];

function formatPercent(value: number, total: number) {
  if (!total) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return "-";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);

  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

export default function AgentStatsTable() {
  const [range, setRange] = useState<DashboardRange>("today");
  const [stats, setStats] = useState<ChessStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      setIsLoading(true);
      const nextStats = await getChessStats(range);

      if (!isMounted) {
        return;
      }

      setStats(nextStats);
      setIsLoading(false);
    }

    void loadStats();
    const interval = window.setInterval(loadStats, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [range]);

  const totalGames = stats?.total_games ?? 0;
  const agentWins = stats?.agent_wins ?? 0;
  const humanWins = stats?.human_wins ?? 0;
  const draws = stats?.draws ?? 0;
  const abandoned = stats?.abandoned_games ?? 0;

  return (
    <section className="border border-neutral-800 bg-neutral-900 p-3 shadow-xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Agent stats</h2>
          <p className="text-xs text-neutral-500">
            {isLoading ? "Loading" : "Aggregate results"}
          </p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-4 overflow-hidden border border-neutral-800 text-xs">
        {ranges.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRange(option.value)}
            className={`border-r border-neutral-800 px-2 py-1.5 last:border-r-0 ${
              range === option.value
                ? "bg-neutral-100 font-semibold text-neutral-950"
                : "bg-neutral-950 text-neutral-400"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-px overflow-hidden border border-neutral-800 bg-neutral-800">
        <div className="flex items-center justify-between bg-neutral-950 px-2 py-1.5">
          <p className="text-xs text-neutral-500">Games</p>
          <p className="font-mono text-sm text-neutral-100">{totalGames}</p>
        </div>
        <div className="flex items-center justify-between bg-neutral-950 px-2 py-1.5">
          <p className="text-xs text-neutral-500">Agent win rate</p>
          <p className="font-mono text-sm text-neutral-100">
            {formatPercent(agentWins, totalGames)}
          </p>
        </div>
        <div className="flex items-center justify-between bg-neutral-950 px-2 py-1.5">
          <p className="text-xs text-neutral-500">Human win rate</p>
          <p className="font-mono text-sm text-neutral-100">
            {formatPercent(humanWins, totalGames)}
          </p>
        </div>
        <div className="flex items-center justify-between bg-neutral-950 px-2 py-1.5">
          <p className="text-xs text-neutral-500">Draw rate</p>
          <p className="font-mono text-sm text-neutral-100">
            {formatPercent(draws, totalGames)}
          </p>
        </div>
        <div className="flex items-center justify-between bg-neutral-950 px-2 py-1.5">
          <p className="text-xs text-neutral-500">Abandoned</p>
          <p className="font-mono text-sm text-neutral-100">
            {formatPercent(abandoned, totalGames)}
          </p>
        </div>
        <div className="flex items-center justify-between bg-neutral-950 px-2 py-1.5">
          <p className="text-xs text-neutral-500">Avg moves</p>
          <p className="font-mono text-sm text-neutral-100">
            {formatNumber(stats?.average_move_count ?? 0)}
          </p>
        </div>
        <div className="flex items-center justify-between bg-neutral-950 px-2 py-1.5">
          <p className="text-xs text-neutral-500">Avg duration</p>
          <p className="font-mono text-sm text-neutral-100">
            {formatDuration(stats?.average_duration ?? null)}
          </p>
        </div>
        <div className="flex items-center justify-between bg-neutral-950 px-2 py-1.5">
          <p className="text-xs text-neutral-500">Avg final eval</p>
          <p className="font-mono text-sm text-neutral-100">
            {stats?.average_final_eval === null || !stats
              ? "-"
              : formatNumber(stats.average_final_eval)}
          </p>
        </div>
      </div>
    </section>
  );
}
