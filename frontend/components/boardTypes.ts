import { PieceColor } from "./Piece";

export type LegalMove = {
  uci: string;
  from_square: string;
  to_square: string;
  promotion: string | null;
};

export type GameState = {
  fen: string;
  turn: PieceColor;
  is_check: boolean;
  is_checkmate: boolean;
  is_stalemate: boolean;
  is_game_over: boolean;
  outcome: ChessOutcome | null;
  legal_move_count: number;
  move?: {
    uci: string;
    san: string;
    from_square: string;
    to_square: string;
    promotion?: string | null;
  };
  agent?: {
    type: string;
    color: PieceColor;
    score: number;
    search_depth: number;
    mobility_weight: number;
    piece_weight: number;
    material_weight: number;
    center_weight: number;
    root_branching_factor: number;
    average_branching_factor: number;
    nodes_generated: number;
    expanded_nodes: number;
    branches_pruned: number;
    pruning_rate: number;
    transposition_hits: number;
    transposition_table_size: number;
  };
};

export type ChessOutcome = {
  winner: PieceColor | null;
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
  reason:
    | "checkmate"
    | "stalemate"
    | "insufficient_material"
    | "seventyfive_move_rule"
    | "fivefold_repetition"
    | "fifty_move_claim"
    | "threefold_claim"
    | "resignation"
    | "variant_win"
    | "variant_loss"
    | "variant_draw";
};

export type SearchStats = {
  turn: PieceColor;
  search_depth: number;
  mobility_weight: number;
  piece_weight: number;
  root_branching_factor: number;
  average_branching_factor: number;
  nodes_generated: number;
  expanded_nodes: number;
  branches_pruned: number;
  pruning_rate: number;
  nodes_by_ply: number[];
  heuristics: {
    agent: HeuristicEval;
    human: HeuristicEval;
  };
};

export type HeuristicEval = {
  color: PieceColor;
  h1_mobility: number;
  h2_piece_count: number;
  h3_material: number;
  h4_center_control: number;
  score: number;
};

export type EvalPoint = {
  ply: number;
  advantage: number;
};

export type GameTotals = {
  agentMoves: number;
  nodesGenerated: number;
  nodesExpanded: number;
};

export type Opponent = "human" | "minimax";
