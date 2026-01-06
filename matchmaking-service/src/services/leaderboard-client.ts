import { query } from '../db';

export async function getUserElo(userId: string): Promise<number> {

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
