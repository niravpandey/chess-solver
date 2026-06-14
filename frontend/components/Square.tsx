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
    <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick?.();
          }
        }}
        className={`
            size-12 sm:size-14
            relative
            flex items-center justify-center
            select-none
            cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-neutral-300/60 focus:ring-inset
            ${color === "black"
            ? "bg-slate-700"
            : "bg-slate-400"}
            ${isActive ? "ring-4 ring-neutral-200/70 ring-inset" : ""}
        `}
        >
        {isLegalMove && (
          <span
            className={`
              absolute rounded-full
              ${piece ? "inset-1 border-4 border-neutral-200/70" : "h-4 w-4 bg-neutral-950/45"}
            `}
          />
        )}
        {piece && (
          <span className="relative z-10 ">
            <FontAwesomeIcon
              icon={pieceIcons[piece.type]}
              className={`
                  block size-10 sm:size-12 overflow-visible
                  ${piece.color === "white"
                  ? "text-white"
                  : "text-black"}
              `}
            />
          </span>
        )}
    </div>
  );
}
