from typing import Literal

from pydantic import BaseModel, Field


class PositionRequest(BaseModel):
    fen: str


class LegalMovesRequest(PositionRequest):
    square: str


class MoveRequest(PositionRequest):
    from_square: str
    to_square: str
    promotion: Literal["q", "r", "b", "n"] | None = "q"


class AgentMoveRequest(PositionRequest):
    mobility_weight: float = 1.0
    piece_weight: float = 1.0
    material_weight: float = 1.0
    center_weight: float = 1.0
    search_depth: int = Field(default=1, ge=1, le=5)
    promotion: Literal["q", "r", "b", "n"] | None = "q"
