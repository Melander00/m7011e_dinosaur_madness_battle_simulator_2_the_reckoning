import { Connection as OriginalConnection } from "rabbitmq-client"; // Only Connection
import * as rabbitmq from "../../src/messaging/rabbitmq";

// ----- Mocks -----
const sendMock = jest.fn().mockResolvedValue(undefined);
const pubCloseMock = jest.fn().mockResolvedValue(undefined);
const connCloseMock = jest.fn().mockResolvedValue(undefined);

// Mock the rabbitmq-client module
jest.mock("rabbitmq-client", () => {
  const Publisher = jest.fn().mockImplementation(() => ({
    send: sendMock,
    close: pubCloseMock,
  }));

  const Connection = jest.fn().mockImplementation(() => ({
    createPublisher: jest.fn(() => new Publisher()),
    on: jest.fn(),
    close: connCloseMock,
  }));

  return { Connection };
});

// Cast Connection to Jest mocked class for TypeScript
const MockedConnection = OriginalConnection as unknown as jest.MockedClass<typeof OriginalConnection>;

describe("RabbitMQ module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("connectRabbitMQ", () => {
    it("connects and initializes publisher", async () => {
      await rabbitmq.connectRabbitMQ();

      expect(MockedConnection).toHaveBeenCalledWith(expect.any(String));

      const connInstance = MockedConnection.mock.results[0].value;
      expect(connInstance.createPublisher).toHaveBeenCalledWith({
        confirm: true,
        exchanges: [{ exchange: "match-events", type: "topic" }],
      });
    });
  });

  describe("publishMatchFound", () => {
    it("publishes a match message", async () => {
      await rabbitmq.connectRabbitMQ();

      const connInstance = MockedConnection.mock.results[0].value;
      const pubInstance = connInstance.createPublisher();

      await rabbitmq.publishMatchFound("user1", "user2", true);

      expect(pubInstance.send).toHaveBeenCalledWith(
        { exchange: "match-events", routingKey: "match.create.new" },
        { user1: "user1", user2: "user2", ranked: true }
      );
    });

    it("throws if publisher not initialized", async () => {
      await rabbitmq.closeRabbitMQ();

      await expect(
        rabbitmq.publishMatchFound("user1", "user2")
      ).rejects.toThrow("RabbitMQ publisher not initialized");
    });
  });

  describe("closeRabbitMQ", () => {
    it("closes publisher and connection", async () => {
      await rabbitmq.connectRabbitMQ();

      const connInstance = MockedConnection.mock.results[0].value;
      const pubInstance = connInstance.createPublisher();

      await rabbitmq.closeRabbitMQ();

      expect(pubInstance.close).toHaveBeenCalled();
      expect(connInstance.close).toHaveBeenCalled();
    });
  });
});
