/**
 * RabbitMQ Setup for Friend Service
 * Ready for future messaging implementation
 */

import { Connection } from "rabbitmq-client";

const RABBITMQ_HOST = process.env.RABBITMQ_URL || "amqp://admin:admin123@localhost:5672";

let rabbit: Connection | null = null;

/**
 * Connect to RabbitMQ
 * Sets up connection with automatic reconnection
 */
export async function connectRabbitMQ(): Promise<Connection> {
  try {
    rabbit = new Connection(RABBITMQ_HOST);

    rabbit.on("error", (err: any) => {
      console.error(`[friend-service] RabbitMQ Error: ${err}`);
    });

    rabbit.on("connection", () => {
      console.log("[friend-service] RabbitMQ connection (re)established");
    });

    console.log("[friend-service] RabbitMQ connected successfully");
    return rabbit;
  } catch (error) {
    console.error("[friend-service] Failed to connect to RabbitMQ:", error);
    throw error;
  }
}

/**
 * Get the RabbitMQ connection instance
 */
export function getRabbitMQ(): Connection | null {
  return rabbit;
}

/**
 * Close RabbitMQ connection gracefully
 */
export async function closeRabbitMQ(): Promise<void> {
  if (rabbit) {
    console.log("[friend-service] Closing RabbitMQ connection...");
    await rabbit.close();
    rabbit = null;
    console.log("[friend-service] RabbitMQ connection closed");
  }
}

// ===========================================
// Future: Add publishers and consumers here
// ===========================================

// Example: Publish friend request sent event
// export async function publishFriendRequestSent(fromUserId: string, toUserId: string): Promise<void> {
//   if (!rabbit) throw new Error('RabbitMQ not connected');
//   const publisher = rabbit.createPublisher({
//     confirm: true,
//     exchanges: [{ exchange: 'friend-events', type: 'topic' }]
//   });
//   await publisher.send(
//     { exchange: 'friend-events', routingKey: 'friend.request.sent' },
//     { fromUserId, toUserId, timestamp: new Date().toISOString() }
//   );
//   await publisher.close();
// }

// Example: Publish friendship created event
// export async function publishFriendshipCreated(userId1: string, userId2: string): Promise<void> {
//   if (!rabbit) throw new Error('RabbitMQ not connected');
//   const publisher = rabbit.createPublisher({
//     confirm: true,
//     exchanges: [{ exchange: 'friend-events', type: 'topic' }]
//   });
//   await publisher.send(
//     { exchange: 'friend-events', routingKey: 'friend.created' },
//     { userId1, userId2, timestamp: new Date().toISOString() }
//   );
//   await publisher.close();
// }
