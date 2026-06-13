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

        <Board apiUrl={API_URL} />
      </section>
    </main>
  );
}
