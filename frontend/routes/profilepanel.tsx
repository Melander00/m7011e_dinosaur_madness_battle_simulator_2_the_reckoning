import { useEffect, useState } from "react";
import { useAuth } from "~/keycloak/useAuth";
import { getUsersMe } from "~/api/user";

/* -----------------------------
   Frontend-only mock data
   (friends-service not integrated yet)
-------------------------------- */

type Friend = {
  id: string;
  username: string;
  rank?: number;
};

type FriendRequest = {
  id: string;
  username: string;
};

const MOCK_FRIENDS: Friend[] = [
  { id: "u1", username: "Alice", rank: 3 },
  { id: "u2", username: "Bob", rank: 12 },
  { id: "u3", username: "Charlie", rank: 1 },
  { id: "u4", username: "Daisy", rank: 8 },
];

const MOCK_REQUESTS: FriendRequest[] = [
  { id: "r1", username: "Eve" },
  { id: "r2", username: "Frank" },
];

const MOCK_SEARCH_RESULTS: Friend[] = [
  { id: "s1", username: "Grace" },
  { id: "s2", username: "Heidi" },
];

/* -----------------------------
   Component
-------------------------------- */

export default function ProfilePanel() {
  const { token, logout } = useAuth();

  /* -----------------------------
     User profile (real backend)
  -------------------------------- */

  const [profile, setProfile] = useState<{
    userId: string;
    username: string | null;
    quote: string | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);

    getUsersMe(token)
      .then(setProfile)
      .catch(err => {
        console.error(err);
        setError(err.message ?? "Failed to load profile");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const username = profile?.username ?? "User";

  /* -----------------------------
     Avatar (frontend-only)
  -------------------------------- */

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUrl(URL.createObjectURL(file));
  }

  /* -----------------------------
     Friends (mocked)
  -------------------------------- */

  const [friends, setFriends] = useState<Friend[]>(
    [...MOCK_FRIENDS].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
  );

  const [requests, setRequests] = useState<FriendRequest[]>(MOCK_REQUESTS);

  function acceptRequest(id: string) {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    setRequests(r => r.filter(rq => rq.id !== id));
    setFriends(f => [...f, { id, username: req.username }]);
  }

  function rejectRequest(id: string) {
    setRequests(r => r.filter(rq => rq.id !== id));
  }

  /* -----------------------------
     Add friend (mocked)
  -------------------------------- */

  const [search, setSearch] = useState("");
  const [sentRequestTo, setSentRequestTo] = useState<string | null>(null);

  function sendFriendRequest(username: string) {
    setSentRequestTo(username);
  }

  /* -----------------------------
     Render guards
  -------------------------------- */

  if (loading) {
    return <p>Loading profile…</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>{error}</p>;
  }

  /* -----------------------------
     Render
  -------------------------------- */

  return (
    <div style={{ padding: "1rem", maxHeight: "100vh", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Welcome, {username}</h2>
        <button onClick={() => logout()}>Logout</button>
      </div>

      {/* Avatar */}
      <div style={{ marginBottom: "1rem" }}>
        <div
          style={{
            width: 120,
            height: 120,
            border: "1px solid #ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "0.5rem",
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span>No Avatar</span>
          )}
        </div>
        <input type="file" accept="image/*" onChange={onAvatarChange} />
        <p style={{ fontStyle: "italic" }}>
          {profile?.quote ?? "Quote coming soon…"}
        </p>
      </div>

      {/* Friends list */}
      <div style={{ marginBottom: "1rem" }}>
        <h3>Friends</h3>
        <div
          style={{
            maxHeight: 200,
            overflowY: "auto",
            border: "1px solid #ccc",
            padding: "0.5rem",
          }}
        >
          {friends.length === 0 && <p>No friends yet.</p>}
          {friends.map(f => (
            <div
              key={f.id}
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span>{f.username}</span>
              <span>{f.rank ? `Rank ${f.rank}` : "Unranked"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Friend requests */}
      <div style={{ marginBottom: "1rem" }}>
        <h3>Friend Requests</h3>
        {requests.length === 0 && <p>No incoming requests.</p>}
        {requests.map(r => (
          <div
            key={r.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.25rem",
            }}
          >
            <span>{r.username}</span>
            <div>
              <button onClick={() => acceptRequest(r.id)}>Accept</button>
              <button
                onClick={() => rejectRequest(r.id)}
                style={{ marginLeft: "0.5rem" }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add friend */}
      <div>
        <h3>Add Friend</h3>
        <input
          type="text"
          placeholder="Search players…"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setSentRequestTo(null);
          }}
        />

        {search && (
          <div
            style={{
              border: "1px solid #ccc",
              marginTop: "0.5rem",
              padding: "0.5rem",
            }}
          >
            {MOCK_SEARCH_RESULTS.filter(u =>
              u.username.toLowerCase().includes(search.toLowerCase())
            ).map(u => (
              <div
                key={u.id}
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span>{u.username}</span>
                <button onClick={() => sendFriendRequest(u.username)}>
                  Add
                </button>
              </div>
            ))}
          </div>
        )}

        {sentRequestTo && (
          <p style={{ color: "green" }}>
            Friend request sent to {sentRequestTo}
          </p>
        )}
      </div>
    </div>
  );
}
