"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Square from "./Square";
import { Piece, PieceColor, PieceType } from "./Piece";

const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const pieceTypes: Record<string, PieceType> = {
  b: "bishop",
  k: "king",
  n: "knight",
  p: "pawn",
  q: "queen",
  r: "rook",
};

type LegalMove = {
  uci: string;
  from_square: string;
  to_square: string;
  promotion: string | null;
};

type GameState = {
  fen: string;
  turn: PieceColor;
  is_check: boolean;
  is_checkmate: boolean;
  is_stalemate: boolean;
  legal_move_count: number;
  move?: {
    uci: string;
    san: string;
    from_square: string;
    to_square: string;
    promotion?: string | null;
  };
  agent?: {
    type: string;
    color: PieceColor;
    score: number;
    search_depth: number;
    mobility_weight: number;
    piece_weight: number;
    material_weight: number;
    center_weight: number;
    root_branching_factor: number;
    average_branching_factor: number;
    nodes_generated: number;
    expanded_nodes: number;
  };
};

type SearchStats = {
  turn: PieceColor;
  search_depth: number;
  mobility_weight: number;
  piece_weight: number;
  root_branching_factor: number;
  average_branching_factor: number;
  nodes_generated: number;
  expanded_nodes: number;
  nodes_by_ply: number[];
  heuristics: {
    agent: HeuristicEval;
    human: HeuristicEval;
  };
};

type HeuristicEval = {
  color: PieceColor;
  h1_mobility: number;
  h2_piece_count: number;
  h3_material: number;
  h4_center_control: number;
  score: number;
};

type EvalPoint = {
  ply: number;
  advantage: number;
};

type BoardProps = {
  apiUrl: string;
};

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: () => Promise<void>;
    };
  }
}

function squareName(rowIndex: number, colIndex: number) {
  return `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`;
}

function gamePlyFromFen(fen: string) {
  const [, turn = "w", , , , fullmove = "1"] = fen.split(" ");
  const moveNumber = Number(fullmove);

  if (!Number.isFinite(moveNumber)) {
    return 0;
  }

  return (moveNumber - 1) * 2 + (turn === "b" ? 1 : 0);
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(3).replace(/\.?0+$/, "");
}

function signedWeightTerm(weight: number, heuristicName: string) {
  const magnitude = formatNumber(Math.abs(weight));
  return weight < 0
    ? `- ${magnitude}${heuristicName}(s)`
    : `+ ${magnitude}${heuristicName}(s)`;
}

function gameStatus(game: GameState, lastMove?: string) {
  if (game.is_checkmate) {
    const winner = game.turn === "white" ? "Black" : "White";
    return `Checkmate. ${winner} wins${lastMove ? ` after ${lastMove}` : ""}.`;
  }

  if (game.is_stalemate) {
    return "Stalemate. Draw.";
  }

  return `${game.turn === "white" ? "White" : "Black"} to move`;
}

function boardFromFen(fen: string): (Piece | null)[][] {
  const placement = fen.split(" ")[0];

  return placement.split("/").map((rank) => {
    const row: (Piece | null)[] = [];

    for (const char of rank) {
      const emptySquares = Number(char);
      if (Number.isInteger(emptySquares) && emptySquares > 0) {
        row.push(...Array<null>(emptySquares).fill(null));
        continue;
      }

      const color = char === char.toUpperCase() ? "white" : "black";
      row.push({
        color,
        type: pieceTypes[char.toLowerCase()],
      });
    }

    return row;
  });
}

async function postJson<T>(
  apiUrl: string,
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "Request failed");
  }

  return response.json();
}

async function getJson<T>(apiUrl: string, path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`);

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "Request failed");
  }

  return response.json();
}

export default function Board({ apiUrl }: BoardProps) {
  const [game, setGame] = useState<GameState>({
    fen: STARTING_FEN,
    turn: "white",
    is_check: false,
    is_checkmate: false,
    is_stalemate: false,
    legal_move_count: 20,
  });
  const [activeSquare, setActiveSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<LegalMove[]>([]);
  const [opponent, setOpponent] = useState<"human" | "minimax">("minimax");
  const [searchDepth, setSearchDepth] = useState(1);
  const [mobilityWeight, setMobilityWeight] = useState(1);
  const [pieceWeight, setPieceWeight] = useState(1);
  const [materialWeight, setMaterialWeight] = useState(1);
  const [centerWeight, setCenterWeight] = useState(1);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [status, setStatus] = useState("White to move");
  const [previewStats, setPreviewStats] = useState<SearchStats | null>(null);
  const [evalHistory, setEvalHistory] = useState<EvalPoint[]>([]);
  const [gameTotals, setGameTotals] = useState({
    agentMoves: 0,
    nodesGenerated: 0,
    nodesExpanded: 0,
  });
  const failedAgentFen = useRef<string | null>(null);

  const board = useMemo(() => boardFromFen(game.fen), [game.fen]);
  const legalTargets = useMemo(
    () => new Set(legalMoves.map((move) => move.to_square)),
    [legalMoves],
  );
  const activeSearchDepth = opponent === "minimax" ? searchDepth : 0;
  const gamePly = useMemo(() => gamePlyFromFen(game.fen), [game.fen]);

  useEffect(() => {
    window.MathJax?.typesetPromise?.();
  }, [
    game.agent,
    game.legal_move_count,
    gamePly,
    centerWeight,
    mobilityWeight,
    materialWeight,
    opponent,
    pieceWeight,
    previewStats,
    evalHistory,
    activeSearchDepth,
  ]);

  useEffect(() => {
    getJson<GameState>(apiUrl, "/game/new")
      .then((nextGame) => {
        setGame(nextGame);
        setStatus("White to move");
        setEvalHistory([]);
        setGameTotals({
          agentMoves: 0,
          nodesGenerated: 0,
          nodesExpanded: 0,
        });
      })
      .catch(() => setStatus("Backend unavailable"));
  }, [apiUrl]);

  useEffect(() => {
    if (opponent !== "minimax" || game.is_checkmate || game.is_stalemate) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetch(`${apiUrl}/agent/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fen: game.fen,
          search_depth: searchDepth,
          mobility_weight: mobilityWeight,
          piece_weight: pieceWeight,
          material_weight: materialWeight,
          center_weight: centerWeight,
        }),
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Preview failed");
          }

          return response.json() as Promise<SearchStats>;
        })
        .then((stats) => {
          setPreviewStats(stats);
          if (!stats.heuristics) {
            return;
          }

          setEvalHistory((current) => {
            const nextPoint = {
              ply: gamePly,
              advantage: -stats.heuristics.human.score,
            };
            const lastPoint = current.at(-1);

            if (lastPoint && lastPoint.ply === nextPoint.ply) {
              return [...current.slice(0, -1), nextPoint];
            }

            return [...current, nextPoint];
          });
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }

          console.error(error);
          setPreviewStats(null);
        });
    }, 150);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    apiUrl,
    centerWeight,
    game.fen,
    gamePly,
    game.is_checkmate,
    game.is_stalemate,
    mobilityWeight,
    materialWeight,
    opponent,
    pieceWeight,
    searchDepth,
  ]);

  useEffect(() => {
    if (
      opponent !== "minimax" ||
      game.turn !== "black" ||
      game.is_checkmate ||
      game.is_stalemate ||
      isAgentThinking ||
      failedAgentFen.current === game.fen
    ) {
      return;
    }

    setIsAgentThinking(true);
    setActiveSquare(null);
    setLegalMoves([]);
    setStatus("Agent is thinking");

    postJson<GameState>(apiUrl, "/agent/minimax", {
      fen: game.fen,
      search_depth: searchDepth,
      mobility_weight: mobilityWeight,
      piece_weight: pieceWeight,
      material_weight: materialWeight,
      center_weight: centerWeight,
    })
      .then((nextGame) => {
        failedAgentFen.current = null;
        setGame(nextGame);
        if (nextGame.agent) {
          setGameTotals((current) => ({
            agentMoves: current.agentMoves + 1,
            nodesGenerated:
              current.nodesGenerated + nextGame.agent!.nodes_generated,
            nodesExpanded:
              current.nodesExpanded + nextGame.agent!.expanded_nodes,
          }));
        }
        setStatus(
          nextGame.is_checkmate || nextGame.is_stalemate
            ? gameStatus(nextGame, nextGame.move?.san)
            : `Agent played ${nextGame.move?.san ?? ""}`.trim(),
        );
      })
      .catch((error) => {
        console.error(error);
        failedAgentFen.current = game.fen;
        setStatus(
          error instanceof Error && error.message === "Game is already over"
            ? "Game is already over."
            : "Agent move failed",
        );
      })
      .finally(() => setIsAgentThinking(false));
  }, [
    apiUrl,
    centerWeight,
    game.fen,
    game.is_checkmate,
    game.is_stalemate,
    game.turn,
    isAgentThinking,
    mobilityWeight,
    materialWeight,
    opponent,
    pieceWeight,
    searchDepth,
  ]);

  async function selectSquare(square: string, piece: Piece | null) {
    if (game.is_checkmate || game.is_stalemate) {
      setStatus(gameStatus(game));
      return;
    }

    if (isAgentThinking || (opponent === "minimax" && game.turn === "black")) {
      return;
    }

    if (activeSquare && legalTargets.has(square)) {
      try {
        const nextGame = await postJson<GameState>(apiUrl, "/game/move", {
          fen: game.fen,
          from_square: activeSquare,
          to_square: square,
        });
        setGame(nextGame);
        setActiveSquare(null);
        setLegalMoves([]);
        setStatus(gameStatus(nextGame, nextGame.move?.san));
      } catch (error) {
        console.error(error);
        setStatus("Illegal move");
      }
      return;
    }

    if (!piece || piece.color !== game.turn) {
      setActiveSquare(null);
      setLegalMoves([]);
      return;
    }

    try {
      const response = await postJson<{ moves: LegalMove[] }>(
        apiUrl,
        "/game/legal-moves",
        {
          fen: game.fen,
          square,
        },
      );
      setActiveSquare(square);
      setLegalMoves(response.moves);
      setStatus(
        response.moves.length
          ? `${piece.color === "white" ? "White" : "Black"} ${piece.type}: ${response.moves.length} legal moves`
          : "No legal moves",
      );
    } catch (error) {
      console.error(error);
      setStatus("Move lookup failed");
    }
  }

  const lastSearchStats = game.agent
    ? {
        root_branching_factor: game.agent.root_branching_factor,
        average_branching_factor: game.agent.average_branching_factor,
        nodes_generated: game.agent.nodes_generated,
        expanded_nodes: game.agent.expanded_nodes,
      }
    : null;
  const heuristicFormula = `\\[
    h(s)=${formatNumber(mobilityWeight)}h_1(s) ${signedWeightTerm(pieceWeight, "h_2")} ${signedWeightTerm(materialWeight, "h_3")} ${signedWeightTerm(centerWeight, "h_4")}
  \\]`;
  const currentAdvantage = evalHistory.at(-1)?.advantage ?? 0;
  const advantageLabel =
    currentAdvantage > 0
      ? `Human +${formatNumber(currentAdvantage)}`
      : currentAdvantage < 0
        ? `Agent +${formatNumber(Math.abs(currentAdvantage))}`
        : "Equal";

  return (
    <div className="grid gap-8 md:grid-cols-[auto_1fr] items-start">
      <div className="bg-neutral-900 shadow-xl border border-neutral-800">
        <div className="inline-block border-2 border-black">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="flex">
              {row.map((piece, colIndex) => {
                const square = squareName(rowIndex, colIndex);
                const color =
                  (rowIndex + colIndex) % 2 === 0
                    ? "white"
                    : "black";

                return (
                  <Square
                    key={square}
                    color={color}
                    piece={piece}
                    isActive={activeSquare === square}
                    isLegalMove={legalTargets.has(square)}
                    onClick={() => selectSquare(square, piece)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-neutral-900 p-4 shadow-xl border border-neutral-800">
        <h2 className="mb-3 text-xl font-semibold">Match</h2>
        <div className="flex min-h-6 items-center gap-2 text-neutral-300">
          {isAgentThinking && (
            <span className="h-4 w-4 rounded-full border-2 border-neutral-500 border-t-neutral-100 animate-spin" />
          )}
          <span>{status}</span>
        </div>

        <label className="mt-4 grid gap-1 text-sm text-neutral-300">
          Opponent
          <select
            value={opponent}
            onChange={(event) =>
              setOpponent(event.target.value as "human" | "minimax")
            }
            className="border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
          >
            <option value="human">Human</option>
            <option value="minimax">Minimax</option>
          </select>
        </label>

        <div className="mt-5 border-t border-neutral-800 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-neutral-100">
              Advantage
            </p>
            <p className="font-mono text-sm text-neutral-300">
              {advantageLabel}
            </p>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Positive means human/white is ahead; negative means agent/black is ahead.
          </p>
          <div className="mt-3 overflow-x-auto">
            {evalHistory.length > 0 ? (
              <LineChart
                width={360}
                height={180}
                data={evalHistory}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
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
              <div className="grid h-44 place-items-center border border-neutral-800 text-sm text-neutral-500">
                Select minimax to start plotting evaluations.
              </div>
            )}
          </div>
        </div>

        {game.agent && (
          <p className="mt-4 text-sm text-neutral-400">
            Last agent score: {game.agent.score.toFixed(2)}
          </p>
        )}

        <details className="mt-5 border-t border-neutral-800 pt-4 text-sm text-neutral-300">
          <summary className="cursor-pointer font-semibold text-neutral-100">
            Search stats
          </summary>
          <p className="mt-2 text-xs text-neutral-500">
            Plain minimax, no pruning.
          </p>

          <label className="mt-4 grid gap-1 text-sm text-neutral-300">
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
              disabled={opponent === "human"}
              className="w-full accent-neutral-300 disabled:opacity-50"
            />
          </label>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 text-neutral-400">
              <p className="font-semibold text-neutral-200">Last agent search</p>
              <p>{`\\(b_{root}=${lastSearchStats?.root_branching_factor ?? 0}\\)`}</p>
              <p>
                {`\\(\\bar{b}=${formatNumber(lastSearchStats?.average_branching_factor ?? 0)}\\)`}
              </p>
              <p>{`\\(N_{generated}=${lastSearchStats?.nodes_generated ?? 0}\\)`}</p>
              <p>{`\\(N_{expanded}=${lastSearchStats?.expanded_nodes ?? 0}\\)`}</p>
            </div>

            <div className="space-y-2 text-neutral-300">
              <p className="font-semibold text-neutral-200">Game totals</p>
              <p>{`\\(A_{moves}=${gameTotals.agentMoves}\\)`}</p>
              <p>{`\\(N_{generated,total}=${gameTotals.nodesGenerated}\\)`}</p>
              <p>{`\\(N_{expanded,total}=${gameTotals.nodesExpanded}\\)`}</p>
            </div>
          </div>
        </details>

        <details className="mt-5 border-t border-neutral-800 pt-4 text-sm text-neutral-300">
          <summary className="cursor-pointer font-semibold text-neutral-100">
            Heuristics
          </summary>

          <div className="mt-3 overflow-x-auto text-neutral-300">
            <p>{heuristicFormula}</p>
          </div>

          <div className="mt-4">
            <p className="font-semibold text-neutral-200">h1: Mobility</p>
            <p>{`\\[h_1(s)=M_{agent}(s)-M_{opp}(s)\\]`}</p>
            <label className="mt-2 grid gap-1 text-sm text-neutral-300">
              <span className="flex items-center justify-between gap-3">
                <span>Mobility weight</span>
                <span className="font-mono text-neutral-100">
                  {formatNumber(mobilityWeight)}
                </span>
              </span>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={mobilityWeight}
                onChange={(event) => setMobilityWeight(Number(event.target.value))}
                className="w-full accent-neutral-300"
              />
            </label>
          </div>

          <div className="mt-5">
            <p className="font-semibold text-neutral-200">h2: Piece count</p>
            <p>{`\\[h_2(s)=P_{agent}(s)-P_{opp}(s)\\]`}</p>
            <label className="mt-2 grid gap-1 text-sm text-neutral-300">
              <span className="flex items-center justify-between gap-3">
                <span>Piece-count weight</span>
                <span className="font-mono text-neutral-100">
                  {formatNumber(pieceWeight)}
                </span>
              </span>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={pieceWeight}
                onChange={(event) => setPieceWeight(Number(event.target.value))}
                className="w-full accent-neutral-300"
              />
            </label>
          </div>

          <div className="mt-5">
            <p className="font-semibold text-neutral-200">h3: Material</p>
            <p>{`\\[h_3(s)=V_{agent}(s)-V_{opp}(s)\\]`}</p>
            <p className="text-xs text-neutral-500">
              Pawn 1, knight 3, bishop 3, rook 5, queen 9, king 0.
            </p>
            <label className="mt-2 grid gap-1 text-sm text-neutral-300">
              <span className="flex items-center justify-between gap-3">
                <span>Material weight</span>
                <span className="font-mono text-neutral-100">
                  {formatNumber(materialWeight)}
                </span>
              </span>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={materialWeight}
                onChange={(event) => setMaterialWeight(Number(event.target.value))}
                className="w-full accent-neutral-300"
              />
            </label>
          </div>

          <div className="mt-5">
            <p className="font-semibold text-neutral-200">h4: Center control</p>
            <p>{`\\[h_4(s)=C_{agent}(s)-C_{opp}(s)\\]`}</p>
            <p className="text-xs text-neutral-500">
              Counts occupying or attacking d4, e4, d5, and e5.
            </p>
            <label className="mt-2 grid gap-1 text-sm text-neutral-300">
              <span className="flex items-center justify-between gap-3">
                <span>Center-control weight</span>
                <span className="font-mono text-neutral-100">
                  {formatNumber(centerWeight)}
                </span>
              </span>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={centerWeight}
                onChange={(event) => setCenterWeight(Number(event.target.value))}
                className="w-full accent-neutral-300"
              />
            </label>
          </div>
        </details>
      </div>
    </div>
  );
}
