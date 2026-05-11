export type PieceType =
  | "pawn"
  | "knight"
  | "bishop"
  | "rook"
  | "queen"
  | "king";

export type PieceColor =
  | "white"
  | "black";

export type Piece = {
  type: PieceType;
  color: PieceColor;
};