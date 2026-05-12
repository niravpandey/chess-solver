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
}: SquareProps) {
  return (
    <div
        className={`
            w-16 h-16
            flex items-center justify-center
            select-none
            ${color === "black"
            ? "bg-slate-700"
            : "bg-slate-400"}
        `}
        >
        {piece && (
          <span className="grid h-full w-full place-items-center overflow-visible leading-none">
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
    </div>
  );
}
