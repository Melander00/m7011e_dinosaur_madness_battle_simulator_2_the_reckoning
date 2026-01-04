import Leaderboard from "./leaderboard";
import Matchmaking from "./matchmaking";

export default function IndexPage() {
  return (
    <div style={{ padding: "1rem" }}>
      <h1>Dinosaur Madness</h1>

      <section>
        <h2>Leaderboard</h2>
        <Leaderboard />
      </section>

      <section>
        <h2>Matchmaking</h2>
        <Matchmaking />
      </section>
    </div>
  );
}




