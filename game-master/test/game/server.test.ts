import { randomUUID } from "crypto";
jest.mock("../../src/db/redis");
jest.mock("../../src/k8s/kubernetes");
jest.mock("../../src/monitoring/prometheus");
jest.mock("crypto", () => ({
  randomUUID: jest.fn(),
}));


import * as redis from "../../src/db/redis";
import { startGameServer } from "../../src/game/server";
import * as k8s from "../../src/k8s/kubernetes";
import * as prometheus from "../../src/monitoring/prometheus";


describe("startGameServer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a game server and store it in Redis", async () => {
    const fakeUUID = "1234-uuid";
    (randomUUID as jest.Mock).mockReturnValue(fakeUUID);

    const mockServer = {
      matchId: fakeUUID,
      namespace: "game-servers",
      domain: `1234-uuid.ltu-m7011e-1.se`,
      subpath: "",
    };

    (k8s.createGameServer as jest.Mock).mockResolvedValue(mockServer);
    (k8s.waitForServer as jest.Mock).mockResolvedValue(undefined);
    const mockDur = { end: jest.fn() };
    (prometheus.createMatchDuration as jest.Mock).mockReturnValue(mockDur);

    await startGameServer("u1", "u2", true);

    // ensure Kubernetes server creation was called
    expect(k8s.createGameServer).toHaveBeenCalledWith({
      matchId: fakeUUID,
      user1: "u1",
      user2: "u2",
      namespace: "game-servers",
      domain: `1234-uuid.ltu-m7011e-1.se`,
      subpath: "",
      ranked: true,
    });

    // ensure Redis storeMatch and setUserActiveMatch called
    expect(redis.storeMatch).toHaveBeenCalledWith({
      matchId: mockServer.matchId,
      namespace: mockServer.namespace,
      domain: mockServer.domain,
      subpath: mockServer.subpath,
      userIds: ["u1", "u2"],
      expiresAt: 0,
      ranked: true,
    });
    expect(redis.setUserActiveMatch).toHaveBeenCalledWith("u1", fakeUUID);
    expect(redis.setUserActiveMatch).toHaveBeenCalledWith("u2", fakeUUID);

    // ensure waitForServer called
    expect(k8s.waitForServer).toHaveBeenCalledWith(mockServer);

    // ensure prometheus timer ends
    expect(mockDur.end).toHaveBeenCalled();
  });

  it("should handle errors in waitForServer without throwing", async () => {
    const fakeUUID = "1234-uuid";
    (randomUUID as jest.Mock).mockReturnValue(fakeUUID);

    const mockServer = {
      matchId: fakeUUID,
      namespace: "game-servers",
      domain: `1234-uuid.ltu-m7011e-1.se`,
      subpath: "",
    };

    (k8s.createGameServer as jest.Mock).mockResolvedValue(mockServer);
    (k8s.waitForServer as jest.Mock).mockRejectedValue(new Error("fail"));
    const mockDur = { end: jest.fn() };
    (prometheus.createMatchDuration as jest.Mock).mockReturnValue(mockDur);

    // should not throw
    await expect(startGameServer("u1", "u2", false)).resolves.not.toThrow();

    expect(redis.storeMatch).toHaveBeenCalled();
    expect(redis.setUserActiveMatch).toHaveBeenCalledTimes(2);
    expect(mockDur.end).toHaveBeenCalled();
  });
});
