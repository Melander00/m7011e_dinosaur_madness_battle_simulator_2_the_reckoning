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
  userID: number;
  username: string;
};

type FriendsResponse = {
  userId: number;
  friends: BackendFriend[];
  count: number;
};

/**
 * FINAL frontend API
 * Backend mapping happens HERE, nowhere else.
 */
export async function getFriends(_userSub: string): Promise<Friend[]> {
  const res = await fetchJson<FriendsResponse>(`/api/friend/friendships/${_userSub}`);

  return res.friends.map((f) => ({
    id: String(f.userID), // temporary adapter
    username: f.username,
  }));
}
