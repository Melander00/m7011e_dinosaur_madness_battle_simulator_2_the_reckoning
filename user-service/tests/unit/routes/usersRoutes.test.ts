jest.mock("../../../src/auth/keycloak", () => ({
  requireAuth: jest.fn((_req: any, _res: any, next: any) => next()),
}));

jest.mock("../../../src/repositories/userRepository", () => ({
  upsertUser: jest.fn(),
  getUserById: jest.fn(),
}));

jest.mock("../../../src/monitoring/prometheus", () => ({
  incRequestCount: jest.fn(),
  createRequestDuration: jest.fn(() => ({ end: jest.fn() })),
}));

import * as userRepo from "../../../src/repositories/userRepository";
import { getPublicUserById, getUsersMe, postUsersMe } from "../../../src/routes/users";

const mockUpsertUser = userRepo.upsertUser as jest.MockedFunction<typeof userRepo.upsertUser>;
const mockGetUserById = userRepo.getUserById as jest.MockedFunction<typeof userRepo.getUserById>;

type MockRes = {
  statusCode: number;
  body?: any;
  status: jest.Mock;
  json: jest.Mock;
};

function makeRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    status: jest.fn(),
    json: jest.fn(),
  };

  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res as any;
  });

  res.json.mockImplementation((body: any) => {
    res.body = body;
    return res as any;
  });

  return res;
}

describe("users routes (unit)", () => {
  const tokenUserId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /users/me", () => {
    it("creates/updates the user using identity from auth (ignores request body)", async () => {
      // Proves: backend does not trust frontend-provided identity fields.
      mockUpsertUser.mockResolvedValueOnce();

      const req = {
        userId: tokenUserId,
        user: { sub: tokenUserId, preferred_username: "tokenUser" },
        body: { userId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", username: "frontend" },
      } as any;
      const res = makeRes();
      const next = jest.fn();

      await postUsersMe(req, res as any, next);

      expect(mockUpsertUser).toHaveBeenCalledWith(tokenUserId, "tokenUser");
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ userId: tokenUserId, username: "tokenUser" });
    });

    it("returns 500 when the token userId is missing/invalid", async () => {
      // Proves: token-derived userId is validated server-side (UUID check).
      const req = {
        userId: "not-a-uuid",
        user: { sub: "not-a-uuid", preferred_username: "tokenUser" },
        body: {},
      } as any;
      const res = makeRes();
      const next = jest.fn();

      await postUsersMe(req, res as any, next);

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: "Invalid userId in token" });
      expect(mockUpsertUser).not.toHaveBeenCalled();
    });
  });

  describe("GET /users/me", () => {
    it("returns 404 when the authenticated user does not exist", async () => {
      // Proves: profile lookups are based on req.userId (not request body/params).
      mockGetUserById.mockResolvedValueOnce(null);

      const req = {
        userId: tokenUserId,
        user: { sub: tokenUserId, preferred_username: "tokenUser" },
      } as any;
      const res = makeRes();
      const next = jest.fn();

      await getUsersMe(req, res as any, next);

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: "User not found", userId: tokenUserId });
      expect(mockGetUserById).toHaveBeenCalledWith(tokenUserId);
    });

    it("returns the authenticated user profile when it exists", async () => {
      // Proves: route returns DB-backed profile fields for the authenticated user.
      mockGetUserById.mockResolvedValueOnce({
        userid: tokenUserId,
        username: "tokenUser",
        quote: null,
      });

      const req = {
        userId: tokenUserId,
        user: { sub: tokenUserId, preferred_username: "tokenUser" },
      } as any;
      const res = makeRes();
      const next = jest.fn();

      await getUsersMe(req, res as any, next);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        userId: tokenUserId,
        username: "tokenUser",
        quote: null,
      });
    });

    it("auto-creates a missing user in development mode", async () => {
      // Proves: DEV-only behavior upserts and retries when the user row is missing.
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      mockGetUserById
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ userid: tokenUserId, username: "tokenUser", quote: null });
      mockUpsertUser.mockResolvedValueOnce();

      const req = {
        userId: tokenUserId,
        user: { sub: tokenUserId, preferred_username: "tokenUser" },
      } as any;
      const res = makeRes();
      const next = jest.fn();

      await getUsersMe(req, res as any, next);

      expect(mockUpsertUser).toHaveBeenCalledWith(tokenUserId, "tokenUser");
      expect(mockGetUserById).toHaveBeenCalledTimes(2);
      expect(res.statusCode).toBe(200);

      process.env.NODE_ENV = prevEnv;
    });
  });

  describe("GET /users/:userId", () => {
    it("returns 400 for invalid UUIDs", async () => {
      // Proves: public user lookup validates UUIDs before hitting the database.
      const req = { params: { userId: "not-a-uuid" } } as any;
      const res = makeRes();
      const next = jest.fn();

      await getPublicUserById(req, res as any, next);

      expect(res.statusCode).toBe(400);
      expect(mockGetUserById).not.toHaveBeenCalled();
    });

    it("returns 404 when the user does not exist", async () => {
      // Proves: missing users in public lookup are a 404 (not a 200 with nulls).
      const publicUserId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
      mockGetUserById.mockResolvedValueOnce(null);

      const req = { params: { userId: publicUserId } } as any;
      const res = makeRes();
      const next = jest.fn();

      await getPublicUserById(req, res as any, next);

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ error: "User not found", userId: publicUserId });
    });

    it("returns only non-sensitive fields for public lookup", async () => {
      // Proves: response is intentionally limited (no profilePicture/profileBanner leakage).
      const publicUserId = "dddddddd-dddd-dddd-dddd-dddddddddddd";
      mockGetUserById.mockResolvedValueOnce({
        userid: publicUserId,
        username: "publicUser",
        quote: "hello",
        profilepicture: "should-not-leak",
      } as any);

      const req = { params: { userId: publicUserId } } as any;
      const res = makeRes();
      const next = jest.fn();

      await getPublicUserById(req, res as any, next);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ userId: publicUserId, username: "publicUser", quote: "hello" });
      expect(res.body).not.toHaveProperty("profilePicture");
      expect(res.body).not.toHaveProperty("profileBanner");
    });
  });
});
