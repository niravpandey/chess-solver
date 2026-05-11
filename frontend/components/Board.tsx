import Square from "./Square";
import { Piece } from "./Piece";

const board: (Piece | null)[][] = [
  [
    { type: "rook", color: "black" },
    { type: "knight", color: "black" },
    { type: "bishop", color: "black" },
    { type: "queen", color: "black" },
    { type: "king", color: "black" },
    { type: "bishop", color: "black" },
    { type: "knight", color: "black" },
    { type: "rook", color: "black" },
  ],
  Array(8).fill({
    type: "pawn",
    color: "black",
  }),

  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),

  Array(8).fill({
    type: "pawn",
    color: "white",
  }),

  [
    { type: "rook", color: "white" },
    { type: "knight", color: "white" },
    { type: "bishop", color: "white" },
    { type: "queen", color: "white" },
    { type: "king", color: "white" },
    { type: "bishop", color: "white" },
    { type: "knight", color: "white" },
    { type: "rook", color: "white" },
  ],
];

export default function Board() {
  return (
    <div className="inline-block border-2 border-black">
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="flex">
          {row.map((piece, colIndex) => {
            const color =
              (rowIndex + colIndex) % 2 === 0
                ? "white"
                : "black";

            return (
              <Square
                key={colIndex}
                color={color}
                piece={piece}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}