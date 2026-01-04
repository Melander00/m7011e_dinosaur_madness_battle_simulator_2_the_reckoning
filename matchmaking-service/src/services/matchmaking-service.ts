import { query } from '../db';
import { publishMatchFound } from '../messaging/rabbitmq';

interface QueuedPlayer {
  userId: string;
  elo: number;
  queue_start_time: Date;
}

export class MatchmakingService {
  private matchmakingInterval: NodeJS.Timeout | null = null;
  private readonly MATCHMAKING_INTERVAL_MS = 5000; // Check every 5 seconds
  private readonly MAX_ELO_DIFFERENCE = 200; // Maximum elo difference for a match

  async addToQueue(userId: string, elo: number): Promise<void> {
    try {
      await query(
        `INSERT INTO matchmaking_queue (userId, elo, queue_start_time)
         VALUES ($1, $2, NOW())
         ON CONFLICT (userId) DO UPDATE 
         SET elo = $2, queue_start_time = NOW()`,
        [userId, elo]
      );
      console.log(`User ${userId} (elo: ${elo}) added to matchmaking queue`);
    } catch (error) {
      console.error('Error adding user to queue:', error);
      throw error;
    }
  }

  async removeFromQueue(userId: string): Promise<void> {
    try {
      await query(
        `DELETE FROM matchmaking_queue WHERE userId = $1`,
        [userId]
      );
      console.log(`User ${userId} removed from matchmaking queue`);
    } catch (error) {
      console.error('Error removing user from queue:', error);
      throw error;
    }
  }

  async getQueuePosition(userId: string): Promise<number | null> {
    try {
      const result = await query<{ position: number }>(
        `SELECT COUNT(*) + 1 as position
         FROM matchmaking_queue
         WHERE queue_start_time < (
           SELECT queue_start_time FROM matchmaking_queue WHERE userId = $1
         )`,
        [userId]
      );
      return result.rows[0]?.position || null;
    } catch (error) {
      console.error('Error getting queue position:', error);
      return null;
    }
  }

  async findMatch(): Promise<void> {
    try {
      // Get the player who has been waiting the longest
      const longestWaitingResult = await query<QueuedPlayer>(
        `SELECT userId, elo, queue_start_time 
         FROM matchmaking_queue
         ORDER BY queue_start_time ASC
         LIMIT 1`
      );

      if (longestWaitingResult.rows.length === 0) {
        return; // No players in queue
      }

      const longestWaiting = longestWaitingResult.rows[0];
      
      // Calculate how long they've been waiting (in seconds)
      const waitTime = (Date.now() - new Date(longestWaiting.queue_start_time).getTime()) / 1000;
      
      // Increase elo range based on wait time (more lenient after 30 seconds)
      const eloDifference = this.MAX_ELO_DIFFERENCE + Math.floor(waitTime / 30) * 50;

      // Find the closest elo match (excluding the longest waiting player)
      const matchResult = await query<QueuedPlayer>(
        `SELECT userId, elo, queue_start_time
         FROM matchmaking_queue
         WHERE userId != $1
         AND elo BETWEEN $2 AND $3
         ORDER BY ABS(elo - $4) ASC
         LIMIT 1`,
        [
          longestWaiting.userId,
          longestWaiting.elo - eloDifference,
          longestWaiting.elo + eloDifference,
          longestWaiting.elo
        ]
      );

      if (matchResult.rows.length === 0) {
        console.log(`No suitable match found for user ${longestWaiting.userId} (elo: ${longestWaiting.elo})`);
        return;
      }

      const opponent = matchResult.rows[0];

      // Remove both players from queue
      await query(
        `DELETE FROM matchmaking_queue WHERE userId IN ($1, $2)`,
        [longestWaiting.userId, opponent.userId]
      );

      console.log(
        `Match found! ${longestWaiting.userId} (elo: ${longestWaiting.elo}) vs ` +
        `${opponent.userId} (elo: ${opponent.elo}), elo diff: ${Math.abs(longestWaiting.elo - opponent.elo)}`
      );

      // Publish match to game-master via RabbitMQ
      await publishMatchFound(longestWaiting.userId, opponent.userId);

    } catch (error) {
      console.error('Error in findMatch:', error);
    }
  }

  startMatchmaking(): void {
    if (this.matchmakingInterval) {
      console.log('Matchmaking already running');
      return;
    }

    console.log(`Starting matchmaking service (interval: ${this.MATCHMAKING_INTERVAL_MS}ms)`);
    this.matchmakingInterval = setInterval(() => {
      this.findMatch();
    }, this.MATCHMAKING_INTERVAL_MS);
  }

  stopMatchmaking(): void {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
      this.matchmakingInterval = null;
      console.log('Matchmaking service stopped');
    }
  }

  async getQueueStats(): Promise<{ totalPlayers: number; averageWaitTime: number }> {
    try {
      const result = await query<{ total: number; avg_wait: number }>(
        `SELECT 
          COUNT(*) as total,
          COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - queue_start_time))), 0) as avg_wait
         FROM matchmaking_queue`
      );
      
      return {
        totalPlayers: parseInt(result.rows[0].total.toString()),
        averageWaitTime: parseFloat(result.rows[0].avg_wait.toString())
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return { totalPlayers: 0, averageWaitTime: 0 };
    }
  }
}

export const matchmakingService = new MatchmakingService();
