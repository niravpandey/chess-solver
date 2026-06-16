from dataclasses import dataclass
from typing import Literal

import chess

from app.evaluation import evaluate_position

TranspositionFlag = Literal["exact", "lower", "upper"]


@dataclass
class TranspositionEntry:
    depth: int
    score: float
    flag: TranspositionFlag


TranspositionTable = dict[tuple, TranspositionEntry]
PIECE_ORDER_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 300,
    chess.BISHOP: 300,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 10000,
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
            if position.is_game_over(claim_draw=True):
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
        "branches_pruned": 0,
        "pruning_rate": 0,
        "nodes_by_ply": nodes_by_ply,
    }


def ordered_legal_moves(board: chess.Board) -> list[chess.Move]:
    def mvv_lva_score(move: chess.Move) -> int:
        if not board.is_capture(move):
            return 0

        attacker = board.piece_at(move.from_square)
        victim = (
            chess.Piece(chess.PAWN, not board.turn)
            if board.is_en_passant(move)
            else board.piece_at(move.to_square)
        )

        if attacker is None or victim is None:
            return 0

        return (
            PIECE_ORDER_VALUES[victim.piece_type] * 10
            - PIECE_ORDER_VALUES[attacker.piece_type]
        )

    def move_order(move: chess.Move) -> tuple[int, int, int, int, str]:
        is_capture = board.is_capture(move)
        is_promotion = move.promotion is not None
        capture_score = mvv_lva_score(move)
        board.push(move)
        gives_check = board.is_check()
        board.pop()

        return (
            0 if gives_check else 1,
            0 if is_capture else 1,
            0 if is_promotion else 1,
            -capture_score,
            move.uci(),
        )

    return sorted(board.legal_moves, key=move_order)


def alpha_beta(
    board: chess.Board,
    depth: int,
    alpha: float,
    beta: float,
    agent_color: chess.Color,
    mobility_weight: float,
    piece_weight: float,
    material_weight: float,
    center_weight: float,
    stats: dict,
    transposition_table: TranspositionTable,
) -> float:
    stats["nodes_generated"] += 1
    alpha_original = alpha
    beta_original = beta
    transposition_key = board._transposition_key()
    cached = transposition_table.get(transposition_key)

    if cached and cached.depth >= depth:
        stats["transposition_hits"] += 1

        if cached.flag == "exact":
            return cached.score
        if cached.flag == "lower":
            alpha = max(alpha, cached.score)
        elif cached.flag == "upper":
            beta = min(beta, cached.score)

        if alpha >= beta:
            return cached.score

    if depth == 0 or board.is_game_over(claim_draw=True):
        score = evaluate_position(
            board,
            agent_color,
            mobility_weight,
            piece_weight,
            material_weight,
            center_weight,
        )
        transposition_table[transposition_key] = TranspositionEntry(
            depth=depth,
            score=score,
            flag="exact",
        )
        return score

    legal_moves = ordered_legal_moves(board)
    stats["expanded_nodes"] += 1
    stats["branching_total"] += len(legal_moves)

    if not legal_moves:
        return evaluate_position(
            board,
            agent_color,
            mobility_weight,
            piece_weight,
            material_weight,
            center_weight,
        )

    if board.turn == agent_color:
        best_score = float("-inf")

        for index, move in enumerate(legal_moves):
            board.push(move)
            best_score = max(
                best_score,
                alpha_beta(
                    board,
                    depth - 1,
                    alpha,
                    beta,
                    agent_color,
                    mobility_weight,
                    piece_weight,
                    material_weight,
                    center_weight,
                    stats,
                    transposition_table,
                ),
            )
            board.pop()
            alpha = max(alpha, best_score)

            if beta <= alpha:
                stats["branches_pruned"] += len(legal_moves) - index - 1
                break

        flag: TranspositionFlag = "exact"
        if best_score <= alpha_original:
            flag = "upper"
        elif best_score >= beta_original:
            flag = "lower"

        transposition_table[transposition_key] = TranspositionEntry(
            depth=depth,
            score=best_score,
            flag=flag,
        )
        return best_score

    best_score = float("inf")

    for index, move in enumerate(legal_moves):
        board.push(move)
        best_score = min(
            best_score,
            alpha_beta(
                board,
                depth - 1,
                alpha,
                beta,
                agent_color,
                mobility_weight,
                piece_weight,
                material_weight,
                center_weight,
                stats,
                transposition_table,
            ),
        )
        board.pop()
        beta = min(beta, best_score)

        if beta <= alpha:
            stats["branches_pruned"] += len(legal_moves) - index - 1
            break

    flag = "exact"
    if best_score <= alpha_original:
        flag = "upper"
    elif best_score >= beta_original:
        flag = "lower"

    transposition_table[transposition_key] = TranspositionEntry(
        depth=depth,
        score=best_score,
        flag=flag,
    )
    return best_score
