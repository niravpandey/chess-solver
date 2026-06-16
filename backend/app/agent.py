from fastapi import HTTPException

from app.board_utils import color_name, load_board
from app.payloads import board_payload, move_payload
from app.schemas import AgentMoveRequest
from app.search import TranspositionTable, alpha_beta, ordered_legal_moves


def choose_agent_move(request: AgentMoveRequest) -> dict:
    board = load_board(request.fen)

    if board.is_game_over(claim_draw=True):
        raise HTTPException(status_code=400, detail="Game is already over")

    agent_color = board.turn
    best_move = None
    best_score = float("-inf")
    root_moves = ordered_legal_moves(board)
    stats = {
        "nodes_generated": 0,
        "expanded_nodes": 1,
        "branching_total": len(root_moves),
        "branches_pruned": 0,
        "transposition_hits": 0,
    }
    transposition_table: TranspositionTable = {}
    alpha = float("-inf")
    beta = float("inf")

    for move in root_moves:
        board.push(move)
        score = alpha_beta(
            board,
            request.search_depth - 1,
            alpha,
            beta,
            agent_color,
            request.mobility_weight,
            request.piece_weight,
            request.material_weight,
            request.center_weight,
            stats,
            transposition_table,
        )
        board.pop()

        if score > best_score:
            best_move = move
            best_score = score
        alpha = max(alpha, best_score)

    if best_move is None:
        raise HTTPException(status_code=400, detail="No legal moves")

    san = board.san(best_move)
    board.push(best_move)
    average_branching_factor = (
        stats["branching_total"] / stats["expanded_nodes"]
        if stats["expanded_nodes"]
        else 0
    )
    pruning_rate = (
        stats["branches_pruned"]
        / (stats["branches_pruned"] + stats["nodes_generated"])
        if stats["branches_pruned"] + stats["nodes_generated"]
        else 0
    )

    return {
        **board_payload(board),
        "agent": {
            "type": "alpha-beta",
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
            "branches_pruned": stats["branches_pruned"],
            "pruning_rate": pruning_rate,
            "transposition_hits": stats["transposition_hits"],
            "transposition_table_size": len(transposition_table),
        },
        "move": move_payload(best_move, san),
    }
