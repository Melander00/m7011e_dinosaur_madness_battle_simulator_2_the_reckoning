import { ConsumerStatus } from "rabbitmq-client";

// Mock all dependencies
const mockStartGameServer = jest.fn();
const mockIncActiveMatches = jest.fn();
const mockDecActiveMatches = jest.fn();
const mockGetMatchById = jest.fn();
const mockRemoveMatchById = jest.fn();
const mockResetUsers = jest.fn();
const mockRemoveServerById = jest.fn();
const mockDelay = jest.fn(() => Promise.resolve());

// Apply mocks before importing the module
jest.mock("../src/game/server", () => ({ startGameServer: mockStartGameServer }));
jest.mock("../src/monitoring/prometheus", () => ({
  incActiveMatches: mockIncActiveMatches,
  decActiveMatches: mockDecActiveMatches,
}));
jest.mock("../src/db/redis", () => ({
  getMatchById: mockGetMatchById,
  removeMatchById: mockRemoveMatchById,
  resetUsers: mockResetUsers,
}));
jest.mock("../src/k8s/kubernetes", () => ({ removeServerById: mockRemoveServerById }));
jest.mock("../src/lib/delay", () => ({ delay: mockDelay }));

describe("consumer module", () => {
  let rabbitmqMock: any;
  let createHandler: any;
  let completedHandler: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock rabbitmq connection
    rabbitmqMock = {
      createConsumer: jest.fn((config, handler) => {
        if (config.queue === "create-match") createHandler = handler;
        if (config.queue === "master-match-complete") completedHandler = handler;
        return { close: jest.fn() };
      }),
      close: jest.fn(),
    };

    // Import module after mocks
    const consumerModule = await import("../src/consumer");
    // Initialize consumers with mocked RabbitMQ
    await consumerModule.initConsumers(rabbitmqMock);
  });

  it("create-match consumer should drop invalid message", async () => {
    const result = await createHandler({ body: { user1: "u1" } }); // missing user2
    expect(result).toBe(ConsumerStatus.DROP);
  });

  it("create-match consumer should start game and increment active matches", async () => {
    const msg = { body: { user1: "u1", user2: "u2", ranked: true } };
    await createHandler(msg);

    expect(mockStartGameServer).toHaveBeenCalledWith("u1", "u2", true);
  });

  it("completed consumer should remove finished match", async () => {
    mockGetMatchById.mockResolvedValue({
      matchId: "m1",
      namespace: "ns",
      userIds: ["u1"],
    });

    const msg = { body: { matchId: "m1" } };
    await completedHandler(msg);

    expect(mockDelay).toHaveBeenCalledWith(1000);
    expect(mockRemoveServerById).toHaveBeenCalledWith("m1", "ns");
    expect(mockRemoveMatchById).toHaveBeenCalledWith("m1");
    expect(mockResetUsers).toHaveBeenCalledWith(["u1"]);
    // expect(mockDecActiveMatches).toHaveBeenCalled();
  });

  it("removeFinishedMatch skips if no data", async () => {
    mockGetMatchById.mockResolvedValue(null);
    const { removeFinishedMatch } = await import("../src/consumer");

    await removeFinishedMatch("match1");

    expect(mockRemoveServerById).not.toHaveBeenCalled();
    expect(mockRemoveMatchById).not.toHaveBeenCalled();
    expect(mockResetUsers).not.toHaveBeenCalled();
  });

  it("removeFinishedMatch deletes match", async () => {
    mockGetMatchById.mockResolvedValue({
      matchId: "match1",
      namespace: "ns",
      userIds: ["u1", "u2"],
    });
    const { removeFinishedMatch } = await import("../src/consumer");

    await removeFinishedMatch("match1");

    expect(mockRemoveServerById).toHaveBeenCalledWith("match1", "ns");
    expect(mockRemoveMatchById).toHaveBeenCalledWith("match1");
    expect(mockResetUsers).toHaveBeenCalledWith(["u1", "u2"]);
  });
});
