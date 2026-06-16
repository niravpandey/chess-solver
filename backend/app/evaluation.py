import chess

from app.board_utils import color_name


def legal_move_count_for(board: chess.Board, color: chess.Color) -> int:
    candidate = board.copy(stack=False)
    candidate.turn = color
    return candidate.legal_moves.count()


def piece_count_for(board: chess.Board, color: chess.Color) -> int:
    return sum(len(board.pieces(piece_type, color)) for piece_type in chess.PIECE_TYPES)


def material_score_for(board: chess.Board, color: chess.Color) -> int:
    piece_values = {
        chess.PAWN: 1,
        chess.KNIGHT: 3,
        chess.BISHOP: 3,
        chess.ROOK: 5,
        chess.QUEEN: 9,
        chess.KING: 0,
    }

    return sum(
        len(board.pieces(piece_type, color)) * value
        for piece_type, value in piece_values.items()
    )


def center_control_for(board: chess.Board, color: chess.Color) -> int:
    center_squares = [
        chess.D4,
        chess.E4,
        chess.D5,
        chess.E5,
    ]

    return sum(
        int(board.piece_at(square) is not None and board.piece_at(square).color == color)
        + int(board.is_attacked_by(color, square))
        for square in center_squares
    )


def evaluate_position(
    board: chess.Board,
    color: chess.Color,
    mobility_weight: float,
    piece_weight: float,
    material_weight: float,
    center_weight: float,
) -> float:
    opponent = not color
    mobility_score = legal_move_count_for(board, color) - legal_move_count_for(board, opponent)
    piece_score = piece_count_for(board, color) - piece_count_for(board, opponent)
    material_score = material_score_for(board, color) - material_score_for(board, opponent)
    center_score = center_control_for(board, color) - center_control_for(board, opponent)

    outcome = board.outcome(claim_draw=True)
    if outcome is not None:
        if outcome.winner is None:
            return 0.0

        return 100000.0 if outcome.winner == color else -100000.0

    return (
        mobility_weight * mobility_score
        + piece_weight * piece_score
        + material_weight * material_score
        + center_weight * center_score
    )


def heuristic_payload(
    board: chess.Board,
    color: chess.Color,
    mobility_weight: float,
    piece_weight: float,
    material_weight: float,
    center_weight: float,
) -> dict:
    opponent = not color
    h1 = legal_move_count_for(board, color) - legal_move_count_for(board, opponent)
    h2 = piece_count_for(board, color) - piece_count_for(board, opponent)
    h3 = material_score_for(board, color) - material_score_for(board, opponent)
    h4 = center_control_for(board, color) - center_control_for(board, opponent)

    return {
        "color": color_name(color),
        "h1_mobility": h1,
        "h2_piece_count": h2,
        "h3_material": h3,
        "h4_center_control": h4,
        "score": (
            mobility_weight * h1
            + piece_weight * h2
            + material_weight * h3
            + center_weight * h4
        ),
    }
