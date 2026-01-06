/**
 * RabbitMQ Consumer for Match Results
 * Listens for match result events and updates player ELO ratings
 */

import { Connection } from "rabbitmq-client";
import { calculateELO, STARTING_ELO } from "./elo";
import { query } from "./db";

const RABBITMQ_HOST =
  process.env.RABBITMQ_URL || "amqp://admin:admin123@localhost:5672";

const LEADERBOARD_MATCH_RESULTS_QUEUE = "leaderboard-match-results";
const MATCH_EVENTS_EXCHANGE = "match-events";

export interface MatchResultMessage {
  winnerId: string;
  loserId: string;
  matchId: string;
  timestamp: number;
  ranked: boolean;
}

/**
 * Initialize RabbitMQ connection and start consuming match results
 * Consumer is created ONLY after connection is established
 */
export async function startLeaderboardMatchResultConsumer() {
  const rabbit = new Connection(RABBITMQ_HOST);

  rabbit.on("error", (err: any) => {
    console.error("[Leaderboard Service] RabbitMQ Error:", err);
  });

  rabbit.on("connection", () => {
    console.log("[Leaderboard Service] RabbitMQ connected");

    const consumer = rabbit.createConsumer(
      {
        queue: LEADERBOARD_MATCH_RESULTS_QUEUE,
        queueOptions: {
          durable: true,
        },
        qos: {
          prefetchCount: 1,
        },
        exchanges: [
          {
            exchange: MATCH_EVENTS_EXCHANGE,
            type: "topic",
          },
        ],
        queueBindings: [
          {
            exchange: MATCH_EVENTS_EXCHANGE,
            routingKey: "match.result.*",
          },
        ],
      },
      async (msg: any) => {
        try {
          const body = msg.body as MatchResultMessage;

          console.log(
            `[Leaderboard Service] Processing match result: Winner=${body.winnerId}, Loser=${body.loserId}, Ranked=${body.ranked}`
          );

          // Only ranked matches affect leaderboard
          if (!body.ranked) {
            console.log(
              `[Leaderboard Service] Skipping unranked match: ${body.matchId}`
            );
            return;
          }

          await processLeaderboardMatchResult(body);

          console.log(
            `[Leaderboard Service] Successfully processed match ${body.matchId}`
          );
        } catch (error) {
          console.error(
            "[Leaderboard Service] Error processing match result:",
            error
          );
          throw error; // causes requeue
        }
      }
    );

    consumer.on("error", (err: any) => {
      console.error("[Leaderboard Service] Consumer Error:", err);
    });

    console.log(
      `[Leaderboard Service] Started consuming from queue: ${LEADERBOARD_MATCH_RESULTS_QUEUE}`
    );

    const shutdown = async () => {
      console.log("[Leaderboard Service] Shutting down RabbitMQ consumer...");
      await consumer.close();
      await rabbit.close();
      console.log("[Leaderboard Service] RabbitMQ consumer shut down");
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  });

  return rabbit;
}

/**
 * Process a match result message and update ELO ratings
 */
export async function processLeaderboardMatchResult(
  message: MatchResultMessage
): Promise<void> {
  const { winnerId, loserId, matchId, ranked } = message;

  // ---- REQUIRED VALIDATION (tests depend on exact wording & order) ----
  if (!winnerId || !loserId) {
    throw new Error(
      "Invalid match result: winnerId and loserId are required"
    );
  }

  if (!matchId) {
    throw new Error(
      "Invalid match result: matchId is required"
    );
  }

  if (winnerId === loserId) {
    throw new Error(
      "Invalid match result: Winner and loser cannot be the same player"
    );
  }

  // Only ranked matches affect leaderboard
  if (!ranked) return;

  const { rows } = await query(
    "SELECT userid, rankedpoints FROM ranks WHERE userid = ANY($1::uuid[])",
    [[winnerId, loserId]]
  );

  const ratings = new Map<string, number>(
    rows.map((r: any) => [r.userid, r.rankedpoints])
  );

  const winnerRating = ratings.get(winnerId) ?? STARTING_ELO;
  const loserRating = ratings.get(loserId) ?? STARTING_ELO;

  const { newWinnerRating, newLoserRating } = calculateELO(
    winnerRating,
    loserRating
  );

  await query(
    `INSERT INTO ranks (userid, rankedpoints)
     VALUES ($1, $2)
     ON CONFLICT (userid) DO UPDATE SET rankedpoints = $2`,
    [winnerId, newWinnerRating]
  );

  await query(
    `INSERT INTO ranks (userid, rankedpoints)
     VALUES ($1, $2)
     ON CONFLICT (userid) DO UPDATE SET rankedpoints = $2`,
    [loserId, newLoserRating]
  );

  console.log(
    `[Leaderboard Service] ELO updated: ${winnerId} ${winnerRating}→${newWinnerRating}, ${loserId} ${loserRating}→${newLoserRating}`
  );
}


