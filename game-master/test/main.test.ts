import "dotenv/config";

describe("game-master init", () => {
  let initRedisMock: jest.Mock;
  let initRabbitMQMock: jest.Mock;
  let createAppMock: jest.Mock;
  let initConsumersMock: jest.Mock;
  let beginWatchingMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    initRedisMock = jest.fn().mockResolvedValue(undefined);
    initRabbitMQMock = jest.fn().mockResolvedValue({} as any);
    createAppMock = jest.fn();
    initConsumersMock = jest.fn().mockReturnValue(jest.fn().mockResolvedValue(undefined));
    beginWatchingMock = jest.fn().mockReturnValue(jest.fn().mockResolvedValue(undefined));

    jest.doMock("../src/db/redis", () => ({
      initRedis: initRedisMock,
    }));

    jest.doMock("../src/messaging/rabbitmq", () => ({
      initRabbitMQ: initRabbitMQMock,
    }));

    jest.doMock("../src/app", () => ({
      createApp: createAppMock,
    }));

    jest.doMock("../src/consumer", () => ({
      initConsumers: initConsumersMock,
    }));

    jest.doMock("../src/expiryHandler", () => ({
      beginWatchingForExpiredMatches: beginWatchingMock,
    }));
  });

  test("calls all init functions and sets up shutdown handlers", async () => {
    const processOnSpy = jest.spyOn(process, "on").mockImplementation((_event, _handler): any => {});

    // Load the entrypoint
    await jest.isolateModulesAsync(async () => {
      await import("../src/main"); // or the path to your main file
    });

    expect(initRedisMock).toHaveBeenCalled();
    expect(initRabbitMQMock).toHaveBeenCalled();
    expect(createAppMock).toHaveBeenCalled();
    expect(initConsumersMock).toHaveBeenCalledWith({});
    expect(beginWatchingMock).toHaveBeenCalled();
    expect(processOnSpy).toHaveBeenCalledWith("SIGINT", expect.any(Function));
    expect(processOnSpy).toHaveBeenCalledWith("SIGTERM", expect.any(Function));

    processOnSpy.mockRestore();
  });
});
