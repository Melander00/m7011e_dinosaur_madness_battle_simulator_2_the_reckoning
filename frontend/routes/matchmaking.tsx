import { useEffect, useState } from "react";
import { useAuth } from "~/keycloak/useAuth";
import { getActiveMatch } from "~/api/gameMasterClient";

import type { Friend } from "~/api/friends";
import { getFriends } from "~/api/friends";
import { getFriendsMock } from "~/api/friends.mock";

// 🔁 Toggle when backend is live
const USE_MOCKS = true;
const loadFriends = USE_MOCKS ? getFriendsMock : getFriends;

type Mode = "ranked" | "friendly";
type State = "idle" | "selecting" | "searching" | "error";

export default function Matchmaking() {
  const { token, tokenParsed } = useAuth();
  const userSub = tokenParsed?.sub; // Keycloak subject (UUID)

  const [mode, setMode] = useState<Mode | null>(null);
  const [state, setState] = useState<State>("idle");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll Game Master when searching
  useEffect(() => {
    if (state !== "searching" || !token) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const match = await getActiveMatch(token);
        if (cancelled) return;

        window.location.href = `https://${match.domain}${match.subpath}`;
      } catch {
        if (!cancelled) setTimeout(poll, 2000);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [state, token]);

  function startRanked() {
    setError(null);
    setMode("ranked");
    setState("searching");
  }

  async function startFriendly() {
    if (!userSub && !USE_MOCKS) {
      setError("User not authenticated");
      return;
    }

    setError(null);
    setMode("friendly");
    setState("selecting");

    try {
      const list = USE_MOCKS
        ? await getFriendsMock()
        : await loadFriends(userSub as string);

      setFriends(list);
    } catch {
      setError("Failed to load friends");
      setState("error");
    }
  }

  function challengeFriend() {
    if (!selectedFriendId) {
      setError("Please select a friend");
      return;
    }

    // Real system would POST matchmaking intent here
    setState("searching");
  }

  // ─────────── UI ───────────

  if (state === "idle") {
    return (
      <div>
        <h2>Matchmaking</h2>
        <button onClick={startRanked}>Ranked Match</button>
        <button onClick={startFriendly} style={{ marginLeft: "1rem" }}>
          Friendly Match
        </button>
      </div>
    );
  }

  if (state === "selecting") {
    return (
      <div>
        <h2>Friendly Match</h2>

        <select
          value={selectedFriendId ?? ""}
          onChange={(e) => setSelectedFriendId(e.target.value)}
        >
          <option value="">Select a friend</option>
          {friends.map((f) => (
            <option key={f.id} value={f.id}>
              {f.username}
            </option>
          ))}
        </select>

        <div style={{ marginTop: "1rem" }}>
          <button onClick={challengeFriend}>Challenge</button>
          <button onClick={() => setState("idle")} style={{ marginLeft: "1rem" }}>
            Cancel
          </button>
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    );
  }

  if (state === "searching") {
    return (
      <div>
        <h2>Matchmaking</h2>
        <p>
          {mode === "ranked"
            ? "Looking for ranked match…"
            : "Waiting for friend to accept…"}
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div>
        <h2>Matchmaking</h2>
        <p>Error: {error}</p>
        <button onClick={() => setState("idle")}>Back</button>
      </div>
    );
  }

  return null;
}


