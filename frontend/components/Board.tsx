"use client";

import { useEffect, useMemo, useState } from "react";
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
  };
};

type BoardProps = {
  apiUrl: string;
};

function squareName(rowIndex: number, colIndex: number) {
  return `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`;
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
  const [opponent, setOpponent] = useState("human");
  const [status, setStatus] = useState("White to move");

  const board = useMemo(() => boardFromFen(game.fen), [game.fen]);
  const legalTargets = useMemo(
    () => new Set(legalMoves.map((move) => move.to_square)),
    [legalMoves],
  );

  useEffect(() => {
    fetch(`${apiUrl}/game/new`)
      .then((response) => response.json())
      .then((nextGame: GameState) => setGame(nextGame))
      .catch(() => setStatus("Backend unavailable"));
  }, [apiUrl]);

  async function selectSquare(square: string, piece: Piece | null) {
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
        setStatus(
          nextGame.is_checkmate
            ? `Checkmate after ${nextGame.move?.san}`
            : nextGame.is_stalemate
              ? "Stalemate"
              : `${nextGame.turn === "white" ? "White" : "Black"} to move`,
        );
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Illegal move");
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
      setStatus(error instanceof Error ? error.message : "Move lookup failed");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-neutral-400">
            {opponent === "human" ? "Two humans" : "Agent"}
          </p>
          <p className="text-lg font-semibold text-neutral-100">{status}</p>
        </div>
        <label className="grid gap-1 text-sm text-neutral-300">
          Opponent
          <select
            value={opponent}
            onChange={(event) => setOpponent(event.target.value)}
            className="border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
          >
            <option value="human">Human</option>
          </select>
        </label>
      </div>

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
  );
}
