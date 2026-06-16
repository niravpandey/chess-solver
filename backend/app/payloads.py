import chess

from app.board_utils import color_name


def outcome_reason(termination: chess.Termination) -> str:
    reasons = {
        chess.Termination.CHECKMATE: "checkmate",
        chess.Termination.STALEMATE: "stalemate",
        chess.Termination.INSUFFICIENT_MATERIAL: "insufficient_material",
        chess.Termination.SEVENTYFIVE_MOVES: "seventyfive_move_rule",
        chess.Termination.FIVEFOLD_REPETITION: "fivefold_repetition",
        chess.Termination.FIFTY_MOVES: "fifty_move_claim",
        chess.Termination.THREEFOLD_REPETITION: "threefold_claim",
        chess.Termination.VARIANT_WIN: "variant_win",
        chess.Termination.VARIANT_LOSS: "variant_loss",
        chess.Termination.VARIANT_DRAW: "variant_draw",
    }

    return reasons[termination]


def outcome_payload(board: chess.Board) -> dict | None:
    outcome = board.outcome(claim_draw=True)

    if outcome is None:
        return None

    return {
        "winner": color_name(outcome.winner) if outcome.winner is not None else None,
        "result": outcome.result(),
        "reason": outcome_reason(outcome.termination),
    }


def board_payload(board: chess.Board) -> dict:
    return {
        "fen": board.fen(),
        "turn": color_name(board.turn),
        "is_check": board.is_check(),
        "is_checkmate": board.is_checkmate(),
        "is_stalemate": board.is_stalemate(),
        "is_game_over": board.is_game_over(claim_draw=True),
        "outcome": outcome_payload(board),
        "legal_move_count": board.legal_moves.count(),
    }


def move_payload(move: chess.Move, san: str) -> dict:
    return {
        "uci": move.uci(),
        "san": san,
        "from_square": chess.square_name(move.from_square),
        "to_square": chess.square_name(move.to_square),
        "promotion": chess.piece_symbol(move.promotion) if move.promotion else None,
    }


def legal_move_payload(move: chess.Move) -> dict:
    return {
        "uci": move.uci(),
        "from_square": chess.square_name(move.from_square),
        "to_square": chess.square_name(move.to_square),
        "promotion": chess.piece_symbol(move.promotion) if move.promotion else None,
    }
