import Leaderboard from "./leaderboard";
import Matchmaking from "./matchmaking";
import ProfilePanel from "./profilepanel";

export default function IndexPage() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      
      {/* LEFT SIDE — Game content */}
      <div style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
        <h1>Dinosaur Madness</h1>

        <section style={{ marginBottom: "2rem" }}>
          <h2>Leaderboard</h2>
          <Leaderboard />
        </section>

        <section>
          <h2>Matchmaking</h2>
          <Matchmaking />
        </section>
      </div>

      {/* RIGHT SIDE — Profile & social */}
      <div
        style={{
          flex: 1,
          borderLeft: "1px solid #ddd",
          overflowY: "auto",
        }}
      >
        <ProfilePanel />
      </div>

    </div>
  );
}



