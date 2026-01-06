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
   Endpoints (match backend routes)
   Backend routes are:
   POST /users/me
   GET  /users/me
   GET  /users/:userId
-------------------------------- */

export function postUsersMe(token: string) {
  return fetchJson<PostUsersMeResponse>("/api/user/users/me", {
    method: "POST",
    token,
  });
}

export function getUsersMe(token: string) {
  return fetchJson<UserMeResponse>("/api/user/users/me", { token });
}

export function getUserById(userId: string) {
  return fetchJson<UserMeResponse>(`/api/user/users/${userId}`);
}
