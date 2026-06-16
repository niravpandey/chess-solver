import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChessBishop,
  faChessKnight,
  faChessQueen,
  faChessRook,
} from "@fortawesome/free-solid-svg-icons";
import { PieceColor } from "./Piece";

export type PromotionChoice = "q" | "r" | "b" | "n";

type PromotionPickerProps = {
  color: PieceColor;
  onChoose: (choice: PromotionChoice) => void;
  onCancel: () => void;
};

const choices = [
  { value: "q", label: "Queen", icon: faChessQueen },
  { value: "r", label: "Rook", icon: faChessRook },
  { value: "b", label: "Bishop", icon: faChessBishop },
  { value: "n", label: "Knight", icon: faChessKnight },
] satisfies Array<{
  value: PromotionChoice;
  label: string;
  icon: typeof faChessQueen;
}>;

export default function PromotionPicker({
  color,
  onChoose,
  onCancel,
}: PromotionPickerProps) {
  return (
    <div className="absolute inset-x-2 bottom-2 z-20 border border-neutral-700 bg-neutral-950 p-2 shadow-2xl">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-neutral-300">
        <span className="font-semibold text-neutral-100">Promote pawn</span>
        <button
          type="button"
          onClick={onCancel}
          className="border border-neutral-700 px-2 py-1 text-neutral-300 hover:bg-neutral-800"
        >
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            aria-label={choice.label}
            title={choice.label}
            onClick={() => onChoose(choice.value)}
            className="flex aspect-square items-center justify-center border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-300"
          >
            <FontAwesomeIcon
              icon={choice.icon}
              className={`size-8 ${color === "white" ? "text-white" : "text-neutral-500"}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
