const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default async function Home() {
  const res = await fetch(`${API_URL}/`,{
    cache: "no-store",
  });
  const data = await res.json();

  return (
    <main>
      <h1>Chess Solver</h1>
      <p>trying to connect frontend to backend</p>

      <pre>
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}