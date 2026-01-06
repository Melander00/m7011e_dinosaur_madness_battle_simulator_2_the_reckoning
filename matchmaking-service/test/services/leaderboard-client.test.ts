import * as db from "../../src/db";
import { getUserElo } from "../../src/services/leaderboard-client";

jest.mock("../../src/db", () => ({
  query: jest.fn(),
}));

const queryMock = db.query as jest.MockedFunction<typeof db.query>;

describe("leaderboard-client", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserElo", () => {
    it("returns ranked points if user exists", async () => {
      queryMock.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ rankedpoints: 1500 }],
        command: "SELECT",
        oid: 0,
        fields: [],
      } as any);

      const elo = await getUserElo("user-123");
      expect(queryMock).toHaveBeenCalledWith(
        "SELECT rankedpoints FROM ranks WHERE userId = $1",
        ["user-123"]
      );
      expect(elo).toBe(1500);
    });

    it("returns 1000 if user does not exist", async () => {
      queryMock.mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
        command: "SELECT",
        oid: 0,
        fields: [],
      } as any);

      const elo = await getUserElo("user-456");
      expect(elo).toBe(1000);
    });

    it("returns 1000 if query throws an error", async () => {
      queryMock.mockRejectedValueOnce(new Error("DB error"));

      const elo = await getUserElo("user-789");
      expect(elo).toBe(1000);
    });
  });
});
