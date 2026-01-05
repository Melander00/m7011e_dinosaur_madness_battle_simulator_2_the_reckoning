/**
 * RabbitMQ Consumer for Match Results
 * Listens for match result events and updates player ELO ratings
 */

import { Connection } from "rabbitmq-client";
import { calculateELO, STARTING_ELO } from "./elo";
import { query } from "./db";

const RABBITMQ_HOST = process.env.RABBITMQ_URL || "amqp://admin:admin123@localhost:5672";
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
 * Initialize RabbitMQ connection and start consuming match results for leaderboard
 */
export async function startLeaderboardMatchResultConsumer() {
    try {
        const rabbit = new Connection(RABBITMQ_HOST);

        rabbit.on("error", (err: any) => {
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
        }, async (msg: any) => {
            try {
                const body = msg.body as MatchResultMessage;
                console.log(`[Leaderboard Service] Processing match result: Winner=${body.winnerId}, Loser=${body.loserId}, Ranked=${body.ranked}`);
                
                // Only process ranked matches
                if (!body.ranked) {
                    console.log(`[Leaderboard Service] Skipping unranked match: ${body.matchId}`);
                    return; // Acknowledge but skip processing
                }
                
                await processLeaderboardMatchResult(body);
                
                console.log(`[Leaderboard Service] Successfully processed match result for ${body.winnerId} vs ${body.loserId}`);
            } catch (error) {
                console.error("Error processing match result:", error);
                // Message will be requeued if not acknowledged
                throw error;
            }
        });

        consumer.on("error", (err: any) => {
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
 * EXPORTED for testing
 */
export async function processLeaderboardMatchResult(message: MatchResultMessage): Promise<void> {
    const { winnerId, loserId, matchId, timestamp, ranked } = message;

    if (!winnerId || !loserId) {
        throw new Error('Invalid match result: winnerId and loserId are required');
    }

    if (!matchId) {
        throw new Error('Invalid match result: matchId is required');
    }

    if (winnerId === loserId) {
        throw new Error('Invalid match result: Winner and loser cannot be the same player');
    }

    // Double-check that this is a ranked match (defensive check)
    if (!ranked) {
        console.log(`[Leaderboard Service] Skipping unranked match ${matchId}`);
        return;
    }

    // Get current ratings from DB or use starting ELO for new players
    const { rows } = await query(
        'SELECT userid, rankedpoints FROM ranks WHERE userid = ANY($1::uuid[])',
        [[winnerId, loserId]]
    );
    
    const ratingsMap = new Map<string, number>(rows.map((r: any) => [r.userid, r.rankedpoints]));
    const winnerCurrentRating = ratingsMap.get(winnerId) ?? STARTING_ELO;
    const loserCurrentRating = ratingsMap.get(loserId) ?? STARTING_ELO;
    
    // Calculate new ELO ratings
    const { newWinnerRating, newLoserRating } = calculateELO(winnerCurrentRating, loserCurrentRating);
    
    // Upsert winner rating
    await query(
        `INSERT INTO ranks (userid, rankedpoints) 
         VALUES ($1, $2)
         ON CONFLICT (userid) DO UPDATE SET rankedpoints = $2`,
        [winnerId, newWinnerRating]
    );
    
    // Upsert loser rating
    await query(
        `INSERT INTO ranks (userid, rankedpoints) 
         VALUES ($1, $2)
         ON CONFLICT (userid) DO UPDATE SET rankedpoints = $2`,
        [loserId, newLoserRating]
    );
    
    console.log(`[Leaderboard Service] Match result received: ${winnerId} defeated ${loserId}`);
    console.log(`[Leaderboard Service] Updated ELO: Winner ${winnerCurrentRating} → ${newWinnerRating}, Loser ${loserCurrentRating} → ${newLoserRating}`);
}
