import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { getFriends, getIncomingRequests, getOutgoingRequests, respondToRequest, sendFriendRequest, type Friend, type FriendRequest } from "~/api/friends";
import { getUserById } from "~/api/user";
import { useAuth } from "~/keycloak/useAuth";

export default function FriendPanel() {
  const { token, tokenParsed } = useAuth();
  const userSub = tokenParsed?.sub;

  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState<Friend | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !userSub) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getFriends(userSub, token),
      getIncomingRequests(token),
      getOutgoingRequests(token),
    ])
      .then(([friendList, incomingReqs, outgoingReqs]) => {
        if (cancelled) return;
        setFriends(friendList);
        setIncoming(incomingReqs);
        setOutgoing(outgoingReqs);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, userSub]);

  async function submitSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setError(null);
    setSearchResult(null);

    try {
      const user = await getUserById(searchTerm.trim());
      setSearchResult({
        id: user.userId,
        username: user.username ?? user.userId,
      });
    } catch (err) {
      setSearchResult(null);
      setError(err instanceof Error ? err.message : "Player not found");
    }
  }

  async function sendRequestTo(user: Friend) {
    if (!token) {
      setError("Missing access token");
      return;
    }

    if (friends.some((f) => f.id === user.id) || outgoing.some((o) => o.userId === user.id)) {
      return;
    }

    try {
      await sendFriendRequest(token, user.id);
      setOutgoing((prev) => [...prev, { userId: user.id, status: 0 }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleIncoming(action: "accept" | "reject", userId: string) {
    if (!token) {
      setError("Missing access token");
      return;
    }

    try {
      await respondToRequest(token, userId, action);
      setIncoming((prev) => prev.filter((req) => req.userId !== userId));
      if (action === "accept") {
        setFriends((prev) => [...prev, { id: userId, username: userId }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const renderName = (id: string) => friends.find((f) => f.id === id)?.username ?? id;

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Friends</h2>

      <div style={{ marginBottom: "1rem" }}>
        <h3>Your friends</h3>
        {loading && <p>Loading friends…</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {!loading && !friends.length && !error && <p>No friends yet.</p>}
        {!!friends.length && (
          <ul>
            {friends.map((f) => (
              <li key={f.id}>{f.username}</li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <h3>Find players</h3>
        <form onSubmit={submitSearch} style={{ marginBottom: "0.5rem" }}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter player ID"
            style={{ marginRight: "0.5rem" }}
          />
          <button type="submit">Search</button>
        </form>

        {searchResult && (
          <div style={{ marginBottom: "0.25rem" }}>
            <span>{searchResult.username}</span>
            <button
              onClick={() => void sendRequestTo(searchResult)}
              style={{ marginLeft: "0.5rem" }}
              disabled={
                friends.some((f) => f.id === searchResult.id) ||
                outgoing.some((o) => o.userId === searchResult.id)
              }
            >
              {outgoing.some((o) => o.userId === searchResult.id) ? "Pending" : "Add Friend"}
            </button>
          </div>
        )}

        {outgoing.length > 0 && (
          <div style={{ marginTop: "0.5rem" }}>
            <strong>Outgoing requests:</strong>
            <ul>
              {outgoing.map((req) => (
                <li key={req.userId}>{renderName(req.userId)} — pending</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <h3>Incoming requests</h3>
        {!incoming.length && <p>No new requests.</p>}
        {incoming.map((req) => (
          <div key={req.userId} style={{ marginBottom: "0.5rem" }}>
            <span>{renderName(req.userId)}</span>
            <button onClick={() => void handleIncoming("accept", req.userId)} style={{ marginLeft: "0.5rem" }}>
              Accept
            </button>
            <button onClick={() => void handleIncoming("reject", req.userId)} style={{ marginLeft: "0.5rem" }}>
              Decline
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
