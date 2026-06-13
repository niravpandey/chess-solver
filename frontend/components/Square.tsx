import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChessBishop,
  faChessKing,
  faChessKnight,
  faChessPawn,
  faChessQueen,
  faChessRook,
} from "@fortawesome/free-solid-svg-icons";
import { Piece } from "./Piece";

type SquareProps = {
  color: "white" | "black";
  piece?: Piece | null;
  isActive?: boolean;
  isLegalMove?: boolean;
  onClick?: () => void;
};

const pieceIcons = {
  bishop: faChessBishop,
  king: faChessKing,
  knight: faChessKnight,
  pawn: faChessPawn,
  queen: faChessQueen,
  rook: faChessRook,
};

export default function Square({
  color,
  piece,
  isActive = false,
  isLegalMove = false,
  onClick,
}: SquareProps) {
  return (
    <button
        type="button"
        onClick={onClick}
        className={`
            w-16 h-16
            relative
            flex items-center justify-center
            select-none
            transition
            focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-inset
            ${color === "black"
            ? "bg-slate-700"
            : "bg-slate-400"}
            ${isActive ? "ring-4 ring-amber-300 ring-inset" : ""}
        `}
        >
        {isLegalMove && (
          <span
            className={`
              absolute rounded-full
              ${piece ? "inset-1 border-4 border-emerald-300" : "h-4 w-4 bg-emerald-300"}
            `}
          />
        )}
        {piece && (
          <span className="relative z-10 grid h-full w-full place-items-center overflow-visible leading-none">
            <FontAwesomeIcon
              icon={pieceIcons[piece.type]}
              className={`
                  block size-7 translate-y-0.5 overflow-visible
                  ${piece.color === "white"
                  ? "text-white"
                  : "text-black"}
              `}
            />
          </span>
        )}
    </button>
  );
}
