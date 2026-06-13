import Board from "@/components/Board";
import GitHubRibbon from "@/components/GitHubRibbon";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
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
            <Board apiUrl={API_URL} />
          </div>

          <div className=" bg-neutral-900 p-4 shadow-xl border border-neutral-800">
            <h2 className="mb-3 text-xl font-semibold">
              Match
            </h2>

            <p className="mt-2">
              Current mode: two humans.
            </p> 
            <p className="mt-2">
              Agent modes will attach to the same move API once minimax is ready.
            </p> 
          </div>
        </div>
      </section>
    </main>
  );
}
