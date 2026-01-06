jest.mock("../../../src/db", () => ({
  query: jest.fn(),
}));

import { query } from "../../../src/db";
import { getUserById, upsertUser, type UserRow } from "../../../src/repositories/userRepository";

const mockQuery = query as jest.MockedFunction<typeof query>;

describe("userRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("upsertUser", () => {
    it("passes userId + username to the SQL upsert", async () => {
      // Proves: the repository delegates identity fields to SQL (no hidden transformations).
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      const userId = "11111111-1111-1111-1111-111111111111";
      const username = "alice";

      await upsertUser(userId, username);

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO users"), [userId, username]);
      expect(mockQuery.mock.calls[0]?.[0]).toEqual(expect.stringContaining("ON CONFLICT"));
    });
  });

  describe("getUserById", () => {
    it("returns the first row when the user exists", async () => {
      // Proves: callers get a single user row (not the full result object).
      const user: UserRow = {
        userid: "22222222-2222-2222-2222-222222222222",
        username: "bob",
        quote: "rawr",
      };

      mockQuery.mockResolvedValueOnce({ rows: [user] } as any);

      await expect(getUserById(user.userid)).resolves.toEqual(user);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE userId = $1"), [user.userid]);
    });

    it("returns null when the user does not exist", async () => {
      // Proves: missing users are a normal outcome handled via `null`.
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await expect(getUserById("33333333-3333-3333-3333-333333333333")).resolves.toBeNull();
    });
  });
});
