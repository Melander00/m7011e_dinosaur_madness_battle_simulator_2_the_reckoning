import { useEffect, useState } from "react";
import type { LeaderboardEntry, UserRank } from "~/api/leaderboard";
import { getMyRank, getTopPlayers } from "~/api/leaderboard";
import { useAuth } from "~/keycloak/useAuth";

export default function Leaderboard() {
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { token } = useAuth();

  // Public leaderboard
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

  // Authenticated user rank
  useEffect(() => {
    if (!token) return;

    getMyRank(token)
      .then((data) => {
        setMyRank(data);
      })
      .catch((err) => {
        console.error("Failed to load my rank", err);
      });
  }, [token]);

  if (loading) return <div>Loading leaderboard…</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Top Players</h2>

      {myRank && (
        <div>
          <strong>My Rank:</strong> #{myRank.rank} ({myRank.rankedPoints} pts)
        </div>
      )}

      <ol>
        {players.map((p) => (
          <li key={p.userId}>
            #{p.rank} — {p.username} ({p.rankedPoints} pts)
          </li>
        ))}
      </ol>
    </div>
  );
}


