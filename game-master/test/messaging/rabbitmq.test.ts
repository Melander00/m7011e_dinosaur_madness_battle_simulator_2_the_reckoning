// test/messaging/rabbitmq.test.ts
import { EventEmitter } from "events";

describe("RabbitMQ connector", () => {
  let initRabbitMQ: typeof import("../../src/messaging/rabbitmq").initRabbitMQ;
  let getRabbitMQ: typeof import("../../src/messaging/rabbitmq").getRabbitMQ;
  let MockConnection: jest.Mock;

  beforeEach(() => {
    jest.resetModules();

    MockConnection = jest.fn().mockImplementation(() => {
      const emitter = new EventEmitter();
      return emitter;
    });

    jest.isolateModules(() => {
      jest.mock("rabbitmq-client", () => ({
        Connection: MockConnection,
      }));

      const module = require("../../src/messaging/rabbitmq");
      initRabbitMQ = module.initRabbitMQ;
      getRabbitMQ = module.getRabbitMQ;
    });
  });

  test("initRabbitMQ resolves when connection event is emitted", async () => {
    const promise = initRabbitMQ();

    // Get the instance of Connection that was created
    const connectionInstance = MockConnection.mock.results[0].value as EventEmitter;

    // Emit the 'connection' event to simulate RabbitMQ connecting
    connectionInstance.emit("connection");

    const rabbit = await promise;

    expect(rabbit).toBe(connectionInstance);
    expect(MockConnection).toHaveBeenCalledTimes(1);
  });

  test("initRabbitMQ attaches error handler", async () => {
    const promise = initRabbitMQ();
    const connectionInstance = MockConnection.mock.results[0].value as EventEmitter;

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const error = new Error("Mock error");
    connectionInstance.emit("error", error);

    expect(consoleSpy).toHaveBeenCalledWith(`RabbitMQ Error: ${error}`);

    // Resolve the promise so it doesn't hang
    connectionInstance.emit("connection");
    await promise;

    consoleSpy.mockRestore();
  });
});
