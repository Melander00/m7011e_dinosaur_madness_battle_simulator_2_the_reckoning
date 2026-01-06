import { useEffect, useMemo, useState } from "react";
import { useAuth } from "~/keycloak/useAuth";
import { getUsersMe, postUsersMe, type UserMeResponse } from "~/api/user";

export default function ProfilePanel() {
  const { token, tokenParsed, logout } = useAuth() as {
    token?: string;
    tokenParsed?: { preferred_username?: string; sub?: string };
    logout: (redirectUri?: string) => Promise<void>;
  };

  const displayName = useMemo(() => {
    return tokenParsed?.preferred_username ?? tokenParsed?.sub ?? "User";
  }, [tokenParsed]);

  // Avatar (still frontend-only, not part of user-service)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // User-service profile
  const [profile, setProfile] = useState<UserMeResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUrl(URL.createObjectURL(file));
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        setProfile(null);
        setProfileError("Missing access token (not logged in?)");
        return;
      }

      setProfileLoading(true);
      setProfileError(null);

      try {
        // Ensure user exists in DB (upsert)
        await postUsersMe(token);

        // Fetch profile
        const me = await getUsersMe(token);

        if (!cancelled) setProfile(me);
      } catch (err) {
        if (!cancelled) setProfileError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div style={{ padding: "1rem", maxHeight: "100vh", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Welcome, {displayName}</h2>
        <button onClick={() => void logout()}>Logout</button>
      </div>

      {/* User-service profile */}
      <div style={{ marginBottom: "1rem" }}>
        <h3>Profile</h3>

        {profileLoading && <p>Loading profile…</p>}

        {profileError && (
          <p style={{ color: "red" }}>
            Profile error: {profileError}
          </p>
        )}

        {!profileLoading && !profileError && profile && (
          <div style={{ border: "1px solid #ccc", padding: "0.5rem" }}>
            <div><strong>User ID:</strong> {profile.userId}</div>
            <div><strong>Username:</strong> {profile.username ?? "(none)"}</div>
            <div><strong>Quote:</strong> {profile.quote ?? "Quote coming soon…"}</div>
          </div>
        )}
      </div>

      {/* Avatar (still local-only) */}
      <div style={{ marginBottom: "1rem" }}>
        <h3>Avatar</h3>
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
      </div>
    </div>
  );
}
