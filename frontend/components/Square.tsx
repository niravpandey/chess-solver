import { Piece } from "./Piece";

type SquareProps = {
  color: "white" | "black";
  piece?: Piece | null;
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
            <span
            className={`
                text-4xl font-black
                ${piece.color === "white"
                ? "text-white"
                : "text-black"}
            `}
            >
            {piece.type[0].toUpperCase()}
            </span>
        )}
    </div>
  );
}