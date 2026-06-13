from typing import Literal

import chess
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://chess.niravpandey.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PositionRequest(BaseModel):
    fen: str


class LegalMovesRequest(PositionRequest):
    square: str


class MoveRequest(PositionRequest):
    from_square: str
    to_square: str
    promotion: Literal["q", "r", "b", "n"] | None = "q"


def load_board(fen: str) -> chess.Board:
    try:
        return chess.Board(fen)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid FEN") from exc


def parse_square(square: str) -> int:
    try:
        return chess.parse_square(square)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid square: {square}") from exc


def board_payload(board: chess.Board) -> dict:
    return {
        "fen": board.fen(),
        "turn": "white" if board.turn == chess.WHITE else "black",
        "is_check": board.is_check(),
        "is_checkmate": board.is_checkmate(),
        "is_stalemate": board.is_stalemate(),
        "legal_move_count": board.legal_moves.count(),
    }


@app.get("/")
def root():
    return {"message": "Chess backend running"}


@app.get("/game/new")
def new_game():
    return board_payload(chess.Board())


@app.post("/game/legal-moves")
def legal_moves(request: LegalMovesRequest):
    board = load_board(request.fen)
    from_square = parse_square(request.square)
    piece = board.piece_at(from_square)

    if piece is None:
        return {"from_square": request.square, "moves": []}

    moves = [
        {
            "uci": move.uci(),
            "from_square": chess.square_name(move.from_square),
            "to_square": chess.square_name(move.to_square),
            "promotion": chess.piece_symbol(move.promotion) if move.promotion else None,
        }
        for move in board.legal_moves
        if move.from_square == from_square
    ]

    return {"from_square": request.square, "moves": moves}


@app.post("/game/move")
def make_move(request: MoveRequest):
    board = load_board(request.fen)
    from_square = parse_square(request.from_square)
    to_square = parse_square(request.to_square)

    promotion = None
    piece = board.piece_at(from_square)
    if piece and piece.piece_type == chess.PAWN:
        final_rank = chess.square_rank(to_square)
        if final_rank in {0, 7}:
            promotion = chess.Piece.from_symbol(request.promotion or "q").piece_type

    move = chess.Move(from_square, to_square, promotion=promotion)
    if move not in board.legal_moves:
        raise HTTPException(status_code=400, detail="Illegal move")

    san = board.san(move)
    board.push(move)

    return {
        **board_payload(board),
        "move": {
            "uci": move.uci(),
            "san": san,
            "from_square": request.from_square,
            "to_square": request.to_square,
        },
    }
