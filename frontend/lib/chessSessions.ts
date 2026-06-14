export type ChessResult = "human_win" | "agent_win" | "draw";
export type ChessSessionStatus = "active" | "completed" | "abandoned";
export type DashboardRange = "today" | "7d" | "30d" | "365d";

export type HeuristicConfig = {
  version: string;
  weights: Record<string, number>;
};

export type CreateChessSessionConfig = {
  player_color?: "white" | "black" | null;
  heuristic_config: HeuristicConfig;
  search_depth?: number | null;
  initial_fen?: string;
  metadata?: Record<string, unknown>;
};

export type ChessMoveRecord = {
  ply_number: number;
  move_number: number;
  actor: "human" | "agent";
  fen_before: string;
  fen_after: string;
  move_uci: string;
  move_san: string;
  legal_moves_count: number;
  eval_before: number | null;
  eval_after: number | null;
  eval_delta: number | null;
  move_time_ms: number | null;
  created_at: string;
};

export type AgentAnalysisRecord = {
  ply_number: number;
  move_number: number;
  search_depth_reached: number;
  nodes_generated: number;
  nodes_evaluated: number;
  branches_pruned: number;
  pruning_rate: number;
  search_time_ms: number | null;
  nodes_per_second: number | null;
  selected_move: string;
  selected_eval: number;
  principal_variation: string[];
  top_candidates: Array<{
    move: string;
    eval: number;
    nodes: number;
  }>;
  heuristic_breakdown: Record<string, number> & {
    total: number;
  };
  created_at: string;
};

export type CompleteChessSessionSummary = {
  result: ChessResult;
  result_reason: string;
  move_count: number;
  duration_seconds: number | null;
  final_fen: string;
  final_eval: number | null;
};

export type ChessStats = {
  total_games: number;
  agent_wins: number;
  human_wins: number;
  draws: number;
  abandoned_games: number;
  average_move_count: number;
  average_duration: number | null;
  average_final_eval: number | null;
};

export type RecentChessSession = {
  id: string;
  created_at: string;
  completed_at: string | null;
  status: ChessSessionStatus;
  result: ChessResult | null;
  result_reason: string | null;
  agent_version: string;
  engine_version: string;
  heuristic_schema_version: string;
  heuristic_config: HeuristicConfig;
  search_depth: number | null;
  move_count: number;
  duration_seconds: number | null;
  final_fen: string | null;
  final_eval: number | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

async function supabaseFetch<T>(path: string, init: RequestInit = {}) {
  if (!hasSupabaseConfig()) {
    return null;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
      ...init,
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...init.headers,
      },
    });

    if (!response.ok) {
      console.error("Supabase request failed", await response.text());
      return null;
    }

    if (response.status === 204) {
      return null;
    }

    const text = await response.text();

    if (!text) {
      return null;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Supabase request failed", error);
    return null;
  }
}

async function supabaseWrite(path: string, init: RequestInit = {}) {
  if (!hasSupabaseConfig()) {
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
      ...init,
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
        ...init.headers,
      },
    });

    if (!response.ok) {
      console.error("Supabase request failed", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Supabase request failed", error);
    return false;
  }
}

export async function createChessSession(config: CreateChessSessionConfig) {
  const id = await supabaseFetch<string>("/rest/v1/rpc/create_chess_session", {
    method: "POST",
    body: JSON.stringify({
      payload: {
        player_color: config.player_color ?? null,
        heuristic_config: config.heuristic_config,
        search_depth: config.search_depth ?? null,
        initial_fen: config.initial_fen ?? "startpos",
        metadata: config.metadata ?? {},
      },
    }),
  });

  return id;
}

export async function appendChessMove(
  sessionId: string,
  moveData: ChessMoveRecord,
) {
  return supabaseWrite("/rest/v1/rpc/append_chess_move", {
    method: "POST",
    body: JSON.stringify({
      payload: {
        session_id: sessionId,
        move_data: moveData,
      },
    }),
  });
}

export async function appendAgentAnalysis(
  sessionId: string,
  analysisData: AgentAnalysisRecord,
) {
  return supabaseWrite("/rest/v1/rpc/append_agent_analysis", {
    method: "POST",
    body: JSON.stringify({
      payload: {
        session_id: sessionId,
        analysis_data: analysisData,
      },
    }),
  });
}

export async function completeChessSession(
  sessionId: string,
  summary: CompleteChessSessionSummary,
) {
  return supabaseWrite("/rest/v1/rpc/complete_chess_session", {
    method: "POST",
    body: JSON.stringify({
      payload: {
        session_id: sessionId,
        session_result: summary.result,
        session_result_reason: summary.result_reason,
        session_move_count: summary.move_count,
        session_duration_seconds: summary.duration_seconds,
        session_final_fen: summary.final_fen,
        session_final_eval: summary.final_eval,
      },
    }),
  });
}

export function completeChessSessionOnUnload(
  sessionId: string,
  summary: CompleteChessSessionSummary,
) {
  if (!hasSupabaseConfig()) {
    return;
  }

  fetch(`${SUPABASE_URL}/rest/v1/rpc/complete_chess_session`, {
    method: "POST",
    keepalive: true,
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      payload: {
        session_id: sessionId,
        session_result: summary.result,
        session_result_reason: summary.result_reason,
        session_move_count: summary.move_count,
        session_duration_seconds: summary.duration_seconds,
        session_final_fen: summary.final_fen,
        session_final_eval: summary.final_eval,
      },
    }),
  }).catch(() => undefined);
}

export async function abandonChessSession(sessionId: string) {
  return supabaseWrite("/rest/v1/rpc/abandon_chess_session", {
    method: "POST",
    body: JSON.stringify({
      payload: {
        session_id: sessionId,
      },
    }),
  });
}

export async function getChessStats(range: DashboardRange) {
  const rows = await supabaseFetch<ChessStats[]>("/rest/v1/rpc/get_chess_stats", {
    method: "POST",
    body: JSON.stringify({
      range_text: range,
    }),
  });

  return rows?.[0] ?? null;
}

export async function getRecentChessSessions(limit = 10) {
  return supabaseFetch<RecentChessSession[]>(
    "/rest/v1/rpc/get_recent_chess_sessions",
    {
      method: "POST",
      body: JSON.stringify({
        session_limit: limit,
      }),
    },
  );
}
