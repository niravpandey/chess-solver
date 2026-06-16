import chess
from fastapi import HTTPException


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


def color_name(color: chess.Color) -> str:
    return "white" if color == chess.WHITE else "black"


def promotion_piece_for(
    board: chess.Board,
    from_square: int,
    to_square: int,
    promotion: str | None,
) -> int | None:
    piece = board.piece_at(from_square)

    if piece is None or piece.piece_type != chess.PAWN:
        return None

    final_rank = chess.square_rank(to_square)

    if final_rank not in {0, 7}:
        return None

    return chess.Piece.from_symbol(promotion or "q").piece_type
