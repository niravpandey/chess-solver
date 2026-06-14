import Board from "@/components/Board";
import GitHubRibbon from "@/components/GitHubRibbon";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 p-4 text-neutral-100 sm:p-6">
      <GitHubRibbon href="https://github.com/niravpandey/chess-solver" />
      <section className="mx-auto w-fit max-w-full">
        <div className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight">
            ChessAgent 0.1
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Learnt <i>COMP30024: Artificial Intelligence</i>, and thought to myself
          </p>
          <p className="mt-1 text-sm text-neutral-400 italic">
            Make bot better than Magnus
          </p>
        </div>

        <Board apiUrl={API_URL} />
      </section>
    </main>
  );
}
