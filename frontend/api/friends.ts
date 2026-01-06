// frontend/api/friends.ts

import { fetchJson } from "./http";

/**
 * Frontend-stable friend model
 * ID is opaque (UUID / subject / mapped identifier)
 */
export type Friend = {
  id: string;
  username: string;
};

/**
 * Raw backend response (CURRENT backend, may change)
 * This is intentionally not exported.
 */
type BackendFriend = {
  userID?: number;
  userId?: string;
  username?: string | null;
};

type FriendsResponse = {
  userId: string | number;
  friends: BackendFriend[];
  count: number;
};

type RequestsResponse = {
  userId: string | number;
  requests: Array<{ fromuserid?: string; touserid?: string; status: number }>;
  count: number;
};

export type FriendRequest = { userId: string; status: number };

function mapFriend(f: BackendFriend): Friend {
  const id =
    f.userId ??
    (typeof f.userID === "number" ? String(f.userID) : f.userID);

  const safeId = id ?? "";

  return {
    id: safeId,
    username: f.username ?? safeId,
  };
}

/**
 * FINAL frontend API
 * Backend mapping happens HERE, nowhere else.
 */
export async function getFriends(
  userId: string,
  token?: string
): Promise<Friend[]> {
  // FIX: route through backend API, not frontend
  const path = token
    ? "/api/friend/friendships"
    : `/api/friend/friendships/${userId}`;

  const res = await fetchJson<FriendsResponse>(
    path,
    token ? { token } : undefined
  );

  return res.friends.map(mapFriend);
}

export async function getIncomingRequests(
  token: string
): Promise<FriendRequest[]> {
  // FIX: add /api prefix
  const res = await fetchJson<RequestsResponse>(
    "/api/friend/requests/incoming",
    { token }
  );

  return res.requests
    .map((req) => req.fromuserid ?? "")
    .filter(Boolean)
    .map((userId) => ({ userId, status: 0 }));
}

export async function getOutgoingRequests(
  token: string
): Promise<FriendRequest[]> {
  // FIX: add /api prefix
  const res = await fetchJson<RequestsResponse>(
    "/api/friend/requests/outgoing",
    { token }
  );

  return res.requests
    .map((req) => req.toUserId ?? "")
    .filter(Boolean)
    .map((userId) => ({ userId, status: 0 }));
}

export async function sendFriendRequest(
  token: string,
  toUserId: string
) {
  // FIX: add /api prefix
  return fetchJson("/api/friend/requests", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toUserId }),
  });
}

export async function respondToRequest(
  token: string,
  fromUserId: string,
  action: "accept" | "reject"
) {
  // FIX: add /api prefix
  const path = `/api/friend/requests/${fromUserId}/${action}`;
  return fetchJson(path, { method: "PUT", token });
}
