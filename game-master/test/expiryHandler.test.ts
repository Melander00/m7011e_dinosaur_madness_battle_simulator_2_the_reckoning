
jest.mock("../src/db/redis");
jest.mock("../src/k8s/kubernetes");
jest.mock("../src/monitoring/prometheus");

jest.mock("../src/k8s/kubernetes", () => ({
  removeServerById: jest.fn(),
  createGameServer: jest.fn(),
  waitForServer: jest.fn(),
}));

import { handleExpiredMatches } from "../src/db/redis";
import { beginWatchingForExpiredMatches } from "../src/expiryHandler";
import { removeServerById } from "../src/k8s/kubernetes";
import { decActiveMatches } from "../src/monitoring/prometheus";

describe("beginWatchingForExpiredMatches", () => {
  beforeEach(() => jest.clearAllMocks());

  test("should call decActiveMatches on expired match", async () => {
    const expiredMatch = { matchId: "1", namespace: "ns" };
    (handleExpiredMatches as jest.Mock).mockImplementation(async (cb) => {
      await cb(expiredMatch);
    });

    const stop = beginWatchingForExpiredMatches();
    // Wait a tick for initial call
    await new Promise(process.nextTick);

    expect(removeServerById).toHaveBeenCalledWith("1", "ns");
    expect(decActiveMatches).toHaveBeenCalled();

    // Cleanup interval
    await stop();
  });
});
