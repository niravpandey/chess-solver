"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AgentControlsPanel from "./AgentControlsPanel";
import AgentStatsTable from "./AgentStatsTable";
import GameSidePanel from "./GameSidePanel";
import PromotionPicker, { PromotionChoice } from "./PromotionPicker";
import Square from "./Square";
import { Piece, PieceType } from "./Piece";
import { useChessSessionPersistence } from "@/hooks/useChessSessionPersistence";
import {
  type ChessMoveRecord,
  type ChessResult,
  type HeuristicConfig,
} from "@/lib/chessSessions";
import {
  EvalPoint,
  GameState,
  GameTotals,
  LegalMove,
  Opponent,
  SearchStats,
} from "./boardTypes";

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

type BoardProps = {
  apiUrl: string;
};

type PendingPromotion = {
  fromSquare: string;
  toSquare: string;
  color: "white" | "black";
};

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

function moveNumberFromPly(ply: number) {
  return Math.floor(ply / 2) + 1;
}

function formatOutcomeReason(reason: string) {
  return reason.replaceAll("_", " ");
}

function gameStatus(game: GameState, lastMove?: string) {
  if (game.outcome) {
    if (game.outcome.winner) {
      const winner = game.outcome.winner === "white" ? "White" : "Black";
      return `${winner} wins by ${formatOutcomeReason(game.outcome.reason)}${lastMove ? ` after ${lastMove}` : ""}.`;
    }

    return `Draw by ${formatOutcomeReason(game.outcome.reason)}.`;
  }

  if (game.is_checkmate) {
    const winner = game.turn === "white" ? "Black" : "White";
    return `Checkmate. ${winner} wins${lastMove ? ` after ${lastMove}` : ""}.`;
  }

  if (game.is_stalemate) {
    return "Stalemate. Draw.";
  }

  const player = game.turn === "white" ? "White" : "Black";
  return game.is_check ? `${player} to move in check` : `${player} to move`;
}

function resultForGame(game: GameState): {
  result: ChessResult;
  reason: string;
} | null {
  if (game.outcome) {
    if (!game.outcome.winner) {
      return {
        result: "draw",
        reason: game.outcome.reason,
      };
    }

    return {
      result: game.outcome.winner === "white" ? "human_win" : "agent_win",
      reason: game.outcome.reason,
    };
  }

  if (game.is_checkmate) {
    return {
      result: game.turn === "white" ? "agent_win" : "human_win",
      reason: "checkmate",
    };
  }

  if (game.is_stalemate) {
    return {
      result: "draw",
      reason: "stalemate",
    };
  }

  return null;
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
    is_game_over: false,
    outcome: null,
    legal_move_count: 20,
  });
  const [activeSquare, setActiveSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<LegalMove[]>([]);
  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);
  const [opponent, setOpponent] = useState<Opponent>("minimax");
  const [searchDepth, setSearchDepth] = useState(1);
  const [mobilityWeight, setMobilityWeight] = useState(1);
  const [pieceWeight, setPieceWeight] = useState(1);
  const [materialWeight, setMaterialWeight] = useState(1);
  const [centerWeight, setCenterWeight] = useState(1);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [status, setStatus] = useState("Click Start Game to play");
  const [evalHistory, setEvalHistory] = useState<EvalPoint[]>([]);
  const [gameTotals, setGameTotals] = useState<GameTotals>({
    agentMoves: 0,
    nodesGenerated: 0,
    nodesExpanded: 0,
  });
  const failedAgentFen = useRef<string | null>(null);
  const {
    isStartingGame,
    sessionId,
    persistedMoveCount,
    startSession,
    persistMove,
    persistAgentAnalysis,
    completeSession,
    completeSessionOnUnload,
  } = useChessSessionPersistence();

  const board = useMemo(() => boardFromFen(game.fen), [game.fen]);
  const legalTargets = useMemo(
    () => new Set(legalMoves.map((move) => move.to_square)),
    [legalMoves],
  );
  const gamePly = useMemo(() => gamePlyFromFen(game.fen), [game.fen]);
  const heuristicConfig = useMemo<HeuristicConfig>(
    () => ({
      version: "v1",
      weights: {
        material: materialWeight,
        mobility: mobilityWeight,
        center_control: centerWeight,
        king_safety: 1,
        piece_count: pieceWeight,
      },
    }),
    [centerWeight, materialWeight, mobilityWeight, pieceWeight],
  );

  useEffect(() => {
    getJson<GameState>(apiUrl, "/game/new")
      .then((nextGame) => {
        setGame(nextGame);
        setStatus("Click Start Game to play");
        setEvalHistory([]);
        setGameTotals({
          agentMoves: 0,
          nodesGenerated: 0,
          nodesExpanded: 0,
        });
      })
      .catch(() => setStatus("Backend unavailable"));
  }, [apiUrl]);

  const completeSessionForGameResult = useCallback(
    (
      nextGame: GameState,
      nextMoveCount: number,
      finalEval: number | null,
    ) => {
      const result = resultForGame(nextGame);

      if (!result) {
        return;
      }

      completeSession({
        result: result.result,
        result_reason: result.reason,
        move_count: nextMoveCount,
        final_fen: nextGame.fen,
        final_eval: finalEval,
      });
    },
    [completeSession],
  );

  const resignSummary = useCallback(
    () => ({
      result: "agent_win" as const,
      result_reason: "resignation",
      move_count: persistedMoveCount,
      final_fen: game.fen,
      final_eval: evalHistory.at(-1)?.advantage ?? null,
    }),
    [evalHistory, game.fen, persistedMoveCount],
  );

  function resignGame() {
    if (!sessionId || game.is_game_over) {
      return;
    }

    const summary = resignSummary();
    completeSession(summary);
    setActiveSquare(null);
    setLegalMoves([]);
    setPendingPromotion(null);
    setGame((current) => ({
      ...current,
      is_game_over: true,
      outcome: {
        winner: "black",
        result: "0-1",
        reason: "resignation",
      },
      legal_move_count: 0,
    }));
    setStatus("You resigned. Black wins by resignation.");
  }

  useEffect(() => {
    if (!sessionId || game.is_game_over) {
      return;
    }

    const resignOnExit = () => {
      completeSessionOnUnload(resignSummary());
    };

    window.addEventListener("pagehide", resignOnExit);
    window.addEventListener("beforeunload", resignOnExit);

    return () => {
      window.removeEventListener("pagehide", resignOnExit);
      window.removeEventListener("beforeunload", resignOnExit);
    };
  }, [completeSessionOnUnload, game.is_game_over, resignSummary, sessionId]);

  async function startGame() {
    setActiveSquare(null);
    setLegalMoves([]);
    setPendingPromotion(null);

    try {
      await startSession({
        heuristicConfig,
        opponent,
        searchDepth,
        loadNewGame: () => getJson<GameState>(apiUrl, "/game/new"),
        onGameStarted: (nextGame) => {
          setGame(nextGame);
          setEvalHistory([]);
          setGameTotals({
            agentMoves: 0,
            nodesGenerated: 0,
            nodesExpanded: 0,
          });
          failedAgentFen.current = null;
          setStatus(gameStatus(nextGame));
        },
      });
    } catch (error) {
      console.error(error);
      setStatus("Start Game failed");
    }
  }

  useEffect(() => {
    if (
      !sessionId ||
      opponent !== "minimax" ||
      game.is_game_over
    ) {
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
    game.is_game_over,
    mobilityWeight,
    materialWeight,
    opponent,
    pieceWeight,
    searchDepth,
    sessionId,
  ]);

  useEffect(() => {
    if (
      opponent !== "minimax" ||
      !sessionId ||
      game.turn !== "black" ||
      game.is_game_over ||
      isAgentThinking ||
      failedAgentFen.current === game.fen
    ) {
      return;
    }

    setIsAgentThinking(true);
    setActiveSquare(null);
    setLegalMoves([]);
    setPendingPromotion(null);
    setStatus("Agent is thinking");
    const fenBefore = game.fen;
    const plyBefore = gamePly;
    const evalBefore = evalHistory.at(-1)?.advantage ?? null;
    const searchStartedAt = Date.now();

    postJson<GameState>(apiUrl, "/agent/minimax", {
      fen: fenBefore,
      search_depth: searchDepth,
      mobility_weight: mobilityWeight,
      piece_weight: pieceWeight,
      material_weight: materialWeight,
      center_weight: centerWeight,
    })
      .then((nextGame) => {
        failedAgentFen.current = null;
        const searchTimeMs = Date.now() - searchStartedAt;
        const agentEval =
          nextGame.agent?.color === "black"
            ? -(nextGame.agent?.score ?? 0)
            : (nextGame.agent?.score ?? null);
        const moveData: ChessMoveRecord = {
          ply_number: plyBefore + 1,
          move_number: moveNumberFromPly(plyBefore),
          actor: "agent",
          fen_before: fenBefore,
          fen_after: nextGame.fen,
          move_uci: nextGame.move?.uci ?? "",
          move_san: nextGame.move?.san ?? "",
          legal_moves_count: game.legal_move_count,
          eval_before: evalBefore,
          eval_after: agentEval,
          eval_delta:
            evalBefore !== null && agentEval !== null
              ? agentEval - evalBefore
              : null,
          move_time_ms: searchTimeMs,
          created_at: new Date().toISOString(),
        };
        const nextMoveCount = persistedMoveCount + 1;
        setGame(nextGame);
        if (nextGame.agent) {
          const nodesPerSecond =
            searchTimeMs > 0
              ? Math.round(
                  (nextGame.agent.nodes_generated / searchTimeMs) * 1000,
                )
              : null;

          persistAgentAnalysis({
            ply_number: plyBefore + 1,
            move_number: moveNumberFromPly(plyBefore),
            search_depth_reached: nextGame.agent.search_depth,
            nodes_generated: nextGame.agent.nodes_generated,
            nodes_evaluated: nextGame.agent.expanded_nodes,
            branches_pruned: nextGame.agent.branches_pruned,
            pruning_rate: nextGame.agent.pruning_rate,
            search_time_ms: searchTimeMs,
            nodes_per_second: nodesPerSecond,
            selected_move: nextGame.move?.uci ?? "",
            selected_eval: nextGame.agent.score,
            principal_variation: nextGame.move?.uci ? [nextGame.move.uci] : [],
            top_candidates: [],
            heuristic_breakdown: {
              material: 0,
              mobility: 0,
              center_control: 0,
              king_safety: 0,
              total: nextGame.agent.score,
            },
            created_at: new Date().toISOString(),
          });
          setGameTotals((current) => ({
            agentMoves: current.agentMoves + 1,
            nodesGenerated:
              current.nodesGenerated + nextGame.agent!.nodes_generated,
            nodesExpanded:
              current.nodesExpanded + nextGame.agent!.expanded_nodes,
          }));
        }
        if (resultForGame(nextGame)) {
          void persistMove(moveData).finally(() =>
            completeSessionForGameResult(nextGame, nextMoveCount, agentEval),
          );
        } else {
          void persistMove(moveData);
        }
        setStatus(
          nextGame.is_game_over
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
    completeSessionForGameResult,
    game.fen,
    game.is_game_over,
    game.turn,
    game.legal_move_count,
    gamePly,
    isAgentThinking,
    evalHistory,
    mobilityWeight,
    materialWeight,
    opponent,
    persistAgentAnalysis,
    persistMove,
    pieceWeight,
    persistedMoveCount,
    searchDepth,
    sessionId,
  ]);

  async function submitHumanMove(
    fromSquare: string,
    toSquare: string,
    promotion?: PromotionChoice,
  ) {
    const fenBefore = game.fen;
    const plyBefore = gamePly;
    const evalBefore = evalHistory.at(-1)?.advantage ?? null;

    try {
      const nextGame = await postJson<GameState>(apiUrl, "/game/move", {
        fen: fenBefore,
        from_square: fromSquare,
        to_square: toSquare,
        ...(promotion ? { promotion } : {}),
      });
      const evalAfter = evalHistory.at(-1)?.advantage ?? null;
      const moveData: ChessMoveRecord = {
        ply_number: plyBefore + 1,
        move_number: moveNumberFromPly(plyBefore),
        actor: "human",
        fen_before: fenBefore,
        fen_after: nextGame.fen,
        move_uci: nextGame.move?.uci ?? `${fromSquare}${toSquare}`,
        move_san: nextGame.move?.san ?? `${fromSquare}-${toSquare}`,
        legal_moves_count: game.legal_move_count,
        eval_before: evalBefore,
        eval_after: evalAfter,
        eval_delta:
          evalBefore !== null && evalAfter !== null
            ? evalAfter - evalBefore
            : null,
        move_time_ms: null,
        created_at: new Date().toISOString(),
      };
      const nextMoveCount = persistedMoveCount + 1;
      setGame(nextGame);
      setActiveSquare(null);
      setLegalMoves([]);
      setPendingPromotion(null);
      if (resultForGame(nextGame)) {
        void persistMove(moveData).finally(() =>
          completeSessionForGameResult(nextGame, nextMoveCount, evalAfter),
        );
      } else {
        void persistMove(moveData);
      }
      setStatus(gameStatus(nextGame, nextGame.move?.san));
    } catch (error) {
      console.error(error);
      setStatus("Illegal move");
    }
  }

  async function selectSquare(square: string, piece: Piece | null) {
    if (!sessionId) {
      setStatus("Click Start Game to play");
      return;
    }

    if (game.is_game_over) {
      setStatus(gameStatus(game));
      return;
    }

    if (isAgentThinking || (opponent === "minimax" && game.turn === "black")) {
      return;
    }

    if (activeSquare && legalTargets.has(square)) {
      const promotionMoves = legalMoves.filter(
        (move) => move.to_square === square && move.promotion,
      );

      if (promotionMoves.length) {
        setPendingPromotion({
          fromSquare: activeSquare,
          toSquare: square,
          color: game.turn,
        });
        setStatus("Choose a promotion piece");
        return;
      }

      await submitHumanMove(activeSquare, square);
      return;
    }

    if (!piece || piece.color !== game.turn) {
      setActiveSquare(null);
      setLegalMoves([]);
      setPendingPromotion(null);
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
      setPendingPromotion(null);
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

  return (
    <div className="w-fit">
      <div className="flex flex-col items-start gap-3 xl:flex-row">
        <div className="relative shrink-0 bg-neutral-900 shadow-xl border border-neutral-800">
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
          {pendingPromotion && (
            <PromotionPicker
              color={pendingPromotion.color}
              onChoose={(choice) =>
                void submitHumanMove(
                  pendingPromotion.fromSquare,
                  pendingPromotion.toSquare,
                  choice,
                )
              }
              onCancel={() => {
                setPendingPromotion(null);
                setStatus(gameStatus(game));
              }}
            />
          )}
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
          <div className="w-full sm:w-80">
            <GameSidePanel
              game={game}
              status={status}
              isAgentThinking={isAgentThinking}
              isStartingGame={isStartingGame}
              hasSession={Boolean(sessionId)}
              settingsLocked={Boolean(sessionId)}
              sessionId={sessionId}
              onStartGame={startGame}
              onResignGame={resignGame}
              opponent={opponent}
              setOpponent={setOpponent}
              evalHistory={evalHistory}
            />
          </div>
          <div className="w-full sm:w-72">
            <AgentStatsTable />
          </div>
        </div>
      </div>

      <h1>Control how the agent works!</h1>

      <div className="mt-3">
        <AgentControlsPanel
          game={game}
          gameTotals={gameTotals}
          opponent={opponent}
          settingsLocked={Boolean(sessionId)}
          searchDepth={searchDepth}
          setSearchDepth={setSearchDepth}
          mobilityWeight={mobilityWeight}
          pieceWeight={pieceWeight}
          materialWeight={materialWeight}
          centerWeight={centerWeight}
          setMobilityWeight={setMobilityWeight}
          setPieceWeight={setPieceWeight}
          setMaterialWeight={setMaterialWeight}
          setCenterWeight={setCenterWeight}
        />
      </div>
    </div>
  );
}
