// frontend/api/users.ts
import { fetchJson } from "./http";

/* -----------------------------
   Types (match backend)
-------------------------------- */

export type UserMeResponse = {
  userId: string;
  username: string | null;
  quote: string | null;
};

export type PostUsersMeResponse = {
  userId: string;
  username: string | null;
};

/* -----------------------------
   Endpoints
-------------------------------- */

/**
 * POST /users/me
 * Ensure user exists (upsert)
 */
export function postUsersMe(token: string) {
  return fetchJson<PostUsersMeResponse>("/users/me", {
    method: "POST",
    token,
  });
}

/**
 * GET /users/me
 * Fetch my profile
 */
export function getUsersMe(token: string) {
  return fetchJson<UserMeResponse>("/users/me", {
    token,
  });
}

/**
 * GET /users/:userId
 * Public lookup
 */
export function getUserById(userId: string) {
  return fetchJson<UserMeResponse>(`/users/${userId}`);
}
