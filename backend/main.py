from typing import Literal

import chess
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

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


class AgentMoveRequest(PositionRequest):
    mobility_weight: float = 1.0
    piece_weight: float = 1.0
    material_weight: float = 1.0
    center_weight: float = 1.0
    search_depth: int = Field(default=1, ge=1, le=3)
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


def color_name(color: chess.Color) -> str:
    return "white" if color == chess.WHITE else "black"


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

    if board.is_checkmate():
        return -100000.0 if board.turn == color else 100000.0

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


def estimate_search_stats(board: chess.Board, search_depth: int) -> dict:
    root_branching_factor = board.legal_moves.count()
    nodes_by_ply = []
    frontier = [board.copy(stack=False)]
    nodes_generated = 0
    expanded_nodes = 0
    branching_total = 0

    for _ in range(search_depth):
        next_frontier = []

        for position in frontier:
            if position.is_game_over():
                continue

            moves = list(position.legal_moves)
            expanded_nodes += 1
            branching_total += len(moves)
            nodes_generated += len(moves)

            for move in moves:
                child = position.copy(stack=False)
                child.push(move)
                next_frontier.append(child)

        nodes_by_ply.append(len(next_frontier))
        frontier = next_frontier

    average_branching_factor = (
        branching_total / expanded_nodes if expanded_nodes else 0
    )

    return {
        "root_branching_factor": root_branching_factor,
        "average_branching_factor": average_branching_factor,
        "nodes_generated": nodes_generated,
        "expanded_nodes": expanded_nodes,
        "nodes_by_ply": nodes_by_ply,
    }


def minimax(
    board: chess.Board,
    depth: int,
    agent_color: chess.Color,
    mobility_weight: float,
    piece_weight: float,
    material_weight: float,
    center_weight: float,
    stats: dict,
) -> float:
    stats["nodes_generated"] += 1

    if depth == 0 or board.is_game_over():
        return evaluate_position(
            board,
            agent_color,
            mobility_weight,
            piece_weight,
            material_weight,
            center_weight,
        )

    scores = []
    legal_moves = list(board.legal_moves)
    stats["expanded_nodes"] += 1
    stats["branching_total"] += len(legal_moves)

    for move in legal_moves:
        board.push(move)
        scores.append(
            minimax(
                board,
                depth - 1,
                agent_color,
                mobility_weight,
                piece_weight,
                material_weight,
                center_weight,
                stats,
            )
        )
        board.pop()

    if not scores:
        return evaluate_position(
            board,
            agent_color,
            mobility_weight,
            piece_weight,
            material_weight,
            center_weight,
        )

    return max(scores) if board.turn == agent_color else min(scores)


def move_payload(move: chess.Move, san: str) -> dict:
    return {
        "uci": move.uci(),
        "san": san,
        "from_square": chess.square_name(move.from_square),
        "to_square": chess.square_name(move.to_square),
        "promotion": chess.piece_symbol(move.promotion) if move.promotion else None,
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
        "move": move_payload(move, san),
    }


@app.post("/agent/minimax")
def minimax_agent_move(request: AgentMoveRequest):
    board = load_board(request.fen)

    if board.is_game_over():
        raise HTTPException(status_code=400, detail="Game is already over")

    agent_color = board.turn
    best_move = None
    best_score = float("-inf")
    root_moves = sorted(board.legal_moves, key=lambda candidate: candidate.uci())
    stats = {
        "nodes_generated": 0,
        "expanded_nodes": 1,
        "branching_total": len(root_moves),
    }

    for move in root_moves:
        board.push(move)
        score = minimax(
            board,
            request.search_depth - 1,
            agent_color,
            request.mobility_weight,
            request.piece_weight,
            request.material_weight,
            request.center_weight,
            stats,
        )
        board.pop()

        if score > best_score:
            best_move = move
            best_score = score

    if best_move is None:
        raise HTTPException(status_code=400, detail="No legal moves")

    san = board.san(best_move)
    board.push(best_move)
    average_branching_factor = (
        stats["branching_total"] / stats["expanded_nodes"]
        if stats["expanded_nodes"]
        else 0
    )

    return {
        **board_payload(board),
        "agent": {
            "type": "minimax",
            "color": color_name(agent_color),
            "score": best_score,
            "search_depth": request.search_depth,
            "mobility_weight": request.mobility_weight,
            "piece_weight": request.piece_weight,
            "material_weight": request.material_weight,
            "center_weight": request.center_weight,
            "root_branching_factor": len(root_moves),
            "average_branching_factor": average_branching_factor,
            "nodes_generated": stats["nodes_generated"],
            "expanded_nodes": stats["expanded_nodes"],
        },
        "move": move_payload(best_move, san),
    }


@app.post("/agent/preview")
def agent_preview(request: AgentMoveRequest):
    board = load_board(request.fen)
    agent_color = board.turn

    return {
        "turn": color_name(agent_color),
        "search_depth": request.search_depth,
        "mobility_weight": request.mobility_weight,
        "piece_weight": request.piece_weight,
        "heuristics": {
            "agent": heuristic_payload(
                board,
                agent_color,
                request.mobility_weight,
                request.piece_weight,
                request.material_weight,
                request.center_weight,
            ),
            "human": heuristic_payload(
                board,
                not agent_color,
                request.mobility_weight,
                request.piece_weight,
                request.material_weight,
                request.center_weight,
            ),
        },
        **estimate_search_stats(board, request.search_depth),
    }


@app.post("/agent/one-ply")
def one_ply_agent_move(request: AgentMoveRequest):
    request.search_depth = 1
    return minimax_agent_move(request)
