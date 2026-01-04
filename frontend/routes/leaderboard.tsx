import { useEffect, useState } from "react";
import { getTopPlayers } from "~/api/leaderboard";
import type { LeaderboardEntry } from "~/api/leaderboard";

export default function Leaderboard() {
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTopPlayers(10)
      .then((data) => {
        setPlayers(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? "Failed to load leaderboard");
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading leaderboard…</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Top Players</h2>
      <ol>
        {players.map((p) => (
          <li key={p.userId}>
            #{p.rank} — {p.userId} ({p.rankedPoints} pts)
          </li>
        ))}
      </ol>
    </div>
  );
}

