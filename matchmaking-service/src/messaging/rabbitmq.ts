/**
 * RabbitMQ Setup for Matchmaking Service
 * Publishes match.found events when players are paired
 */

import { Connection, Publisher } from "rabbitmq-client";

const RABBITMQ_HOST = process.env.RABBITMQ_URL || "amqp://admin:admin123@localhost:5672";
const GAME_EVENTS_EXCHANGE = "match-events";

let rabbit: Connection | null = null;
let matchPublisher: Publisher | null = null;

/**
 * Connect to RabbitMQ and set up publisher
 */
export async function connectRabbitMQ(): Promise<void> {
  try {
    rabbit = new Connection(RABBITMQ_HOST);

    rabbit.on("error", (err: any) => {
      console.error(`[matchmaking-service] RabbitMQ Error: ${err}`);
    });

    rabbit.on("connection", () => {
      console.log("[matchmaking-service] RabbitMQ connection (re)established");
    });

    // Create publisher for match events
    matchPublisher = rabbit.createPublisher({
      confirm: true,
      exchanges: [
        { exchange: GAME_EVENTS_EXCHANGE, type: 'topic' }
      ]
    });

    console.log("[matchmaking-service] RabbitMQ connected successfully");
  } catch (error) {
    console.error("[matchmaking-service] Failed to connect to RabbitMQ:", error);
    throw error;
  }
}

type CreateMatchMessage = {
    user1: string;
    user2: string;
    ranked?: boolean;
};

/**
 * Publish match found event when two players are paired
 */
export async function publishMatchFound(player1Id: string, player2Id: string, ranked: boolean = false): Promise<void> {
  if (!matchPublisher) {
    throw new Error('RabbitMQ publisher not initialized');
  }

  const message: CreateMatchMessage = {
    user1: player1Id,
    user2: player2Id,
    ranked: ranked
  };

  await matchPublisher.send(
    { exchange: GAME_EVENTS_EXCHANGE, routingKey: 'match.create.new' },
    message
  );

  console.log('[matchmaking-service] Published match found:', message);
}

/**
 * Close RabbitMQ connection gracefully
 */
export async function closeRabbitMQ(): Promise<void> {
  try {
    if (matchPublisher) {
      await matchPublisher.close();
      matchPublisher = null;
    }
    if (rabbit) {
      await rabbit.close();
      rabbit = null;
    }
    console.log('[matchmaking-service] RabbitMQ connection closed');
  } catch (error) {
    console.error('[matchmaking-service] Error closing RabbitMQ:', error);
  }
}
