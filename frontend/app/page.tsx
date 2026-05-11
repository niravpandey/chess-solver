import Board from "@/components/Board";
import GitHubRibbon from "@/components/GitHubRibbon";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default async function Home() {
  if (!API_URL) {
    throw new Error("Missing NEXT_PUBLIC_API_URL");
  }

  const res = await fetch(`${API_URL}/`, {
    cache: "no-store",
  });

  const data = await res.json();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <GitHubRibbon href="https://github.com/niravpandey/chess-solver" />
      <section className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            ChessAgent 0.1
          </h1>
          <p className="mt-2 text-neutral-400">
            Learnt <i>COMP30024: Artificial Intelligence</i>, and thought to myself
          </p>
          <p className="mt-2 text-neutral-400 italic">
            Make bot better than Magnus
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-[auto_1fr] items-start">
          <div className=" bg-neutral-900 p-4 shadow-xl border border-neutral-800">
            <Board />
          </div>

          <div className=" bg-neutral-900 p-4 shadow-xl border border-neutral-800">
            <h2 className="mb-3 text-xl font-semibold">
              Agent's Moves
            </h2>

            <pre className="overflow-auto  bg-neutral-950 p-4 text-sm text-neutral-300 border border-neutral-800">
              {JSON.stringify(data, null, 2)}
            </pre>
            <p className="mt-2">
              Game unplayable at this stage.
            </p> 
            <p className="mt-2">
              In the future, I want to configure this app such that you, as a player, can select different types of agents to challenge. Minimax (depth=2), Monte Carlo Tree Search, Temporal Difference Learning Agent with Minimax, and many many more...
            </p> 
          </div>
        </div>
      </section>
    </main>
  );
}