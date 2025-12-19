// test/redis.test.ts
import { jest } from "@jest/globals";
import * as redisModule from "../../src/db/redis";
import { StoredGameServer } from "../../src/game/server";

jest.mock("redis", () => {
  const mSet = jest.fn();
  const mGet = jest.fn();
  const mDel = jest.fn();
  const mKeys = jest.fn();
  return {
    createClient: jest.fn(() => ({
      connect: jest.fn(),
      isOpen: false,
      on: jest.fn(),
      get: mGet,
      set: mSet,
      del: mDel,
      keys: mKeys,
    })),
  };
});

describe("redis module", () => {
  let client: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    client = await redisModule.initRedis();
  });

  test("initRedis connects and returns client", async () => {
    expect(client.connect).toHaveBeenCalled();
  });

  test("setUserActiveMatch calls redis.set with correct key and TTL", async () => {
    await redisModule.setUserActiveMatch("user1", "match1");
    expect(client.set).toHaveBeenCalledWith(
      expect.stringContaining("USER_ACTIVE_MATCH:user1"),
      "match1",
      expect.objectContaining({ expiration: { type: "EX", value: 600 } })
    );
  });

  test("getUserActiveMatch calls redis.get with correct key", async () => {
    await redisModule.getUserActiveMatch("user1");
    expect(client.get).toHaveBeenCalledWith("USER_ACTIVE_MATCH:user1");
  });

  test("storeMatch sets match with expiresAt", async () => {
    const server: StoredGameServer = { matchId: "m1", namespace: "ns", userIds: [] } as any;
    await redisModule.storeMatch(server);
    expect(client.set).toHaveBeenCalledWith(
      expect.stringContaining("GAME_SERVER:m1"),
      expect.stringContaining('"matchId":"m1"'),
      {}
    );
    expect(server.expiresAt).toBeDefined();
  });

  test("getMatchById returns parsed object or null", async () => {
    const data = { matchId: "m1", namespace: "ns" };
    client.get.mockResolvedValueOnce(JSON.stringify(data));
    const result = await redisModule.getMatchById("m1");
    expect(result).toEqual(data);

    client.get.mockResolvedValueOnce(null);
    const result2 = await redisModule.getMatchById("m2");
    expect(result2).toBeNull();
  });

  test("handleExpiredMatches calls consumer for expired servers", async () => {
    const now = Date.now();
    const expiredServer = { matchId: "m1", expiresAt: now - 1000, key: "GAME_SERVER:m1" };
    client.keys.mockResolvedValue(["GAME_SERVER:m1"]);
    client.get.mockResolvedValue(JSON.stringify(expiredServer));

    const consumer = jest.fn();
    await redisModule.handleExpiredMatches(consumer);

    expect(consumer).toHaveBeenCalledWith(expiredServer);
    expect(client.del).toHaveBeenCalledWith("GAME_SERVER:m1");
  });

  test("removeMatchById calls redis.del", async () => {
    await redisModule.removeMatchById("m1");
    expect(client.del).toHaveBeenCalledWith("GAME_SERVER:m1");
  });

  test("resetUsers calls redis.del for each user", async () => {
    await redisModule.resetUsers(["u1", "u2"]);
    expect(client.del).toHaveBeenCalledWith("USER_ACTIVE_MATCH:u1");
    expect(client.del).toHaveBeenCalledWith("USER_ACTIVE_MATCH:u2");
  });
});
