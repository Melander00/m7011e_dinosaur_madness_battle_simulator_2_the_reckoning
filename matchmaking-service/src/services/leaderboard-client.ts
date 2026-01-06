import axios from 'axios';
import { query } from '../db';

const LEADERBOARD_SERVICE_URL = process.env.LEADERBOARD_SERVICE_URL || 'http://localhost:3003';

interface LeaderboardResponse {
  userId: string;
  rank: number;
  rankedPoints: number;
}

export async function getUserEloOLD(userId: string, authToken: string): Promise<number> {
  try {
    const response = await axios.get<LeaderboardResponse>(
      `${LEADERBOARD_SERVICE_URL}/rank/me`,
      {
        headers: {
          Authorization: authToken
        }
      }
    );

    return response.data.rankedPoints;
  } catch (error: any) {
    if (error.response?.status === 404) {
      // User not found in leaderboard, return default elo
      console.log(`User ${userId} not found in leaderboard, using default elo`);
      return 1000; // Default starting elo
    }
    console.error('Error fetching user elo:', error.message);
    throw new Error('Failed to fetch user elo from leaderboard service');
  }
}


export async function getUserElo(userId: string, authToken: string): Promise<number> {

    try {
        const res = await query(
            `SELECT rankedpoints FROM ranks WHERE userId = $1`, 
            [userId]
        )

        if(res.rowCount === 0) return 1000

        return res.rows[0].rankedpoints

    } catch {
        return 1000;
    }
}
