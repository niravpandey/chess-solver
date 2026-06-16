import chess
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.agent import choose_agent_move
from app.board_utils import load_board, parse_square, promotion_piece_for
from app.evaluation import heuristic_payload
from app.payloads import board_payload, legal_move_payload, move_payload
from app.schemas import AgentMoveRequest, LegalMovesRequest, MoveRequest
from app.search import estimate_search_stats

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
        legal_move_payload(move)
        for move in board.legal_moves
        if move.from_square == from_square
    ]

    return {"from_square": request.square, "moves": moves}


@app.post("/game/move")
def make_move(request: MoveRequest):
    board = load_board(request.fen)
    from_square = parse_square(request.from_square)
    to_square = parse_square(request.to_square)
    promotion = promotion_piece_for(
        board,
        from_square,
        to_square,
        request.promotion,
    )

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
    return choose_agent_move(request)


@app.post("/agent/preview")
def agent_preview(request: AgentMoveRequest):
    board = load_board(request.fen)
    agent_color = board.turn

    return {
        "turn": "white" if agent_color == chess.WHITE else "black",
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
