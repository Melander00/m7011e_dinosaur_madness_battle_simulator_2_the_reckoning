import { QueryResult } from "pg";
import * as db from "../src/db";

// Mock pg Pool
jest.mock("pg", () => {
  const mClient = {
    query: jest.fn(),
    on: jest.fn(),
  };
  return { Pool: jest.fn(() => mClient) };
});

describe("db module", () => {
  let pool: any;

  beforeAll(() => {
    pool = (db as any).pool;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("query()", () => {
    it("should call pool.query with correct SQL and params", async () => {
      const fakeResult: QueryResult = { rows: [{ id: 1 }], rowCount: 1, command: "SELECT", oid: 0, fields: [] };
      pool.query.mockResolvedValueOnce(fakeResult);

      const sql = "SELECT 1";
      const params: any[] = [];

      const result = await db.query(sql, params);

      expect(pool.query).toHaveBeenCalledWith(sql, params);
      expect(result).toEqual(fakeResult);
    });

    it("should log query details if DB_QUERY_LOG=true", async () => {
      process.env.DB_QUERY_LOG = "true";
      const fakeResult: QueryResult = { rows: [{ id: 1 }], rowCount: 1, command: "SELECT", oid: 0, fields: [] };
      pool.query.mockResolvedValueOnce(fakeResult);

      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      await db.query("SELECT 1");

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
      process.env.DB_QUERY_LOG = undefined;
    });
  });

  describe("healthCheck()", () => {
    it("returns healthy when query succeeds", async () => {
      const now = new Date();
      pool.query.mockResolvedValueOnce({ rows: [{ time: now }], rowCount: 1, command: "SELECT", oid: 0, fields: [] });

      const result = await db.healthCheck();

      expect(result.status).toBe("healthy");
      expect(result.time).toEqual(now);
    });

    it("returns unhealthy when query throws", async () => {
      pool.query.mockRejectedValueOnce(new Error("DB down"));

      const result = await db.healthCheck();

      expect(result.status).toBe("unhealthy");
      expect(result.error).toBe("DB down");
    });
  });
});
