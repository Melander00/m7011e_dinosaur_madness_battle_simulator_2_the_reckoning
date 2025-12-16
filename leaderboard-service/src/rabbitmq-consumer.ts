/**
 * RabbitMQ Consumer for Match Results
 * Listens for match result events and updates player ELO ratings
 */

import { Connection } from "rabbitmq-client";
import { calculateELO, STARTING_ELO } from "./elo";

const RABBITMQ_HOST = process.env.RABBITMQ_URL || "amqp://admin:admin123@localhost:5672";
const LEADERBOARD_MATCH_RESULTS_QUEUE = "leaderboard-match-results";
const MATCH_EVENTS_EXCHANGE = "match-events";

interface MatchResultMessage {
    winnerId: string;
    loserId: string;
    matchId?: string;
    timestamp?: string;
}

/**
 * Initialize RabbitMQ connection and start consuming match results for leaderboard
 */
export async function startLeaderboardMatchResultConsumer() {
    try {
        const rabbit = new Connection(RABBITMQ_HOST);

        rabbit.on("error", (err) => {
            console.error(`RabbitMQ Error: ${err}`);
        });

        rabbit.on("connection", () => {
            console.log("RabbitMQ connection (re)established");
        });

        // Create consumer for match results
        const consumer = rabbit.createConsumer({
            queue: LEADERBOARD_MATCH_RESULTS_QUEUE,
            queueOptions: {
                durable: true, // Survive broker restarts
            },
            qos: {
                prefetchCount: 1 // Process one message at a time
            },
            exchanges: [
                {
                    exchange: MATCH_EVENTS_EXCHANGE,
                    type: 'topic'
                }
            ],
            queueBindings: [
                {
                    exchange: MATCH_EVENTS_EXCHANGE,
                    routingKey: 'match.result.*' // Listen for all match.result.* events
                }
            ],
        }, async (msg) => {
            try {
                const body = msg.body as MatchResultMessage;
                console.log(`[Leaderboard Service] Processing match result: Winner=${body.winnerId}, Loser=${body.loserId}`);
                
                await processLeaderboardMatchResult(body);
                
                console.log(`[Leaderboard Service] Successfully processed match result for ${body.winnerId} vs ${body.loserId}`);
            } catch (error) {
                console.error("Error processing match result:", error);
                // Message will be requeued if not acknowledged
                throw error;
            }
        });

        consumer.on("error", (err) => {
            console.error(`Consumer Error: ${err}`);
        });

        console.log(`[Leaderboard Service] Started consuming from queue: ${LEADERBOARD_MATCH_RESULTS_QUEUE}`);

        // Graceful shutdown
        const shutdown = async () => {
            console.log("[Leaderboard Service] Shutting down RabbitMQ consumer...");
            await consumer.close();
            await rabbit.close();
            console.log("[Leaderboard Service] RabbitMQ consumer shut down successfully");
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        return { rabbit, consumer, shutdown };
    } catch (error) {
        console.error("Failed to start RabbitMQ consumer:", error);
        throw error;
    }
}

/**
 * Process a match result message and update ELO ratings in leaderboard
 */
async function processLeaderboardMatchResult(message: MatchResultMessage): Promise<void> {
    const { winnerId, loserId } = message;

    if (!winnerId || !loserId) {
        throw new Error('Invalid match result: winnerId and loserId are required');
    }

    if (winnerId === loserId) {
        throw new Error('Invalid match result: Winner and loser cannot be the same player');
    }

    // TODO: Replace with your database implementation
    // For now, just log the match result
    console.log(`[Leaderboard Service] Match result received: ${winnerId} defeated ${loserId}`);
    console.log(`[Leaderboard Service] Database integration pending - ELO calculation not persisted`);
    
    // Calculate ELO for demonstration (not persisted)
    const { newWinnerRating, newLoserRating } = calculateELO(STARTING_ELO, STARTING_ELO);
    console.log(`[Leaderboard Service] Calculated ELO: Winner would get ${newWinnerRating}, Loser would get ${newLoserRating}`);
}
