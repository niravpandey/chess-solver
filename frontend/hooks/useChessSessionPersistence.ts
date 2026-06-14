import { useCallback, useRef, useState } from "react";
import {
  abandonChessSession,
  appendAgentAnalysis,
  appendChessMove,
  completeChessSession,
  completeChessSessionOnUnload,
  createChessSession,
  type AgentAnalysisRecord,
  type ChessMoveRecord,
  type ChessResult,
  type CreateChessSessionConfig,
  type HeuristicConfig,
} from "@/lib/chessSessions";
import { GameState, Opponent } from "@/components/boardTypes";

type StartSessionConfig = {
  heuristicConfig: HeuristicConfig;
  opponent: Opponent;
  searchDepth: number;
  loadNewGame: () => Promise<GameState>;
  onGameStarted: (game: GameState) => void;
};

type CompleteSessionSummary = {
  result: ChessResult;
  result_reason: string;
  move_count: number;
  final_fen: string;
  final_eval: number | null;
};

export function useChessSessionPersistence() {
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isPersistedSession, setIsPersistedSession] = useState(false);
  const [persistedMoveCount, setPersistedMoveCount] = useState(0);
  const completedSessionId = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isPersistedSessionRef = useRef(false);
  const sessionStartedAtRef = useRef<number | null>(null);

  function durationSeconds() {
    return sessionStartedAtRef.current
      ? Math.round((Date.now() - sessionStartedAtRef.current) / 1000)
      : null;
  }

  const startSession = useCallback(
    async ({
      heuristicConfig,
      opponent,
      searchDepth,
      loadNewGame,
      onGameStarted,
    }: StartSessionConfig) => {
      setIsStartingGame(true);

      try {
        if (
          sessionId &&
          isPersistedSession &&
          completedSessionId.current !== sessionId
        ) {
          void abandonChessSession(sessionId);
        }

        const nextGame = await loadNewGame();
        const createConfig: CreateChessSessionConfig = {
          player_color: "white",
          heuristic_config: heuristicConfig,
          search_depth: opponent === "minimax" ? searchDepth : null,
          initial_fen: nextGame.fen,
          metadata: {
            opponent,
          },
        };
        const createdSessionId = await createChessSession(createConfig);
        const nextSessionId = createdSessionId ?? crypto.randomUUID();

        setSessionId(nextSessionId);
        setIsPersistedSession(Boolean(createdSessionId));
        sessionIdRef.current = nextSessionId;
        isPersistedSessionRef.current = Boolean(createdSessionId);
        sessionStartedAtRef.current = Date.now();
        setPersistedMoveCount(0);
        completedSessionId.current = null;
        onGameStarted(nextGame);
      } finally {
        setIsStartingGame(false);
      }
    },
    [isPersistedSession, sessionId],
  );

  const persistMove = useCallback(
    (moveData: ChessMoveRecord) => {
      setPersistedMoveCount((current) => current + 1);

      if (!sessionId || !isPersistedSession) {
        return Promise.resolve(null);
      }

      return appendChessMove(sessionId, moveData);
    },
    [isPersistedSession, sessionId],
  );

  const persistAgentAnalysis = useCallback(
    (analysisData: AgentAnalysisRecord) => {
      if (!sessionId || !isPersistedSession) {
        return;
      }

      void appendAgentAnalysis(sessionId, analysisData);
    },
    [isPersistedSession, sessionId],
  );

  const completeSession = useCallback(
    (summary: CompleteSessionSummary) => {
      if (
        !sessionId ||
        !isPersistedSession ||
        completedSessionId.current === sessionId
      ) {
        return;
      }

      completedSessionId.current = sessionId;
      void completeChessSession(sessionId, {
        result: summary.result,
        result_reason: summary.result_reason,
        move_count: summary.move_count,
        duration_seconds: durationSeconds(),
        final_fen: summary.final_fen,
        final_eval: summary.final_eval,
      });
    },
    [isPersistedSession, sessionId],
  );

  const completeSessionOnUnload = useCallback((summary: CompleteSessionSummary) => {
    const activeSessionId = sessionIdRef.current;

    if (
      !activeSessionId ||
      !isPersistedSessionRef.current ||
      completedSessionId.current === activeSessionId
    ) {
      return;
    }

    completedSessionId.current = activeSessionId;
    completeChessSessionOnUnload(activeSessionId, {
      result: summary.result,
      result_reason: summary.result_reason,
      move_count: summary.move_count,
      duration_seconds: durationSeconds(),
      final_fen: summary.final_fen,
      final_eval: summary.final_eval,
    });
  }, []);

  return {
    isStartingGame,
    sessionId,
    isPersistedSession,
    persistedMoveCount,
    startSession,
    persistMove,
    persistAgentAnalysis,
    completeSession,
    completeSessionOnUnload,
  };
}
