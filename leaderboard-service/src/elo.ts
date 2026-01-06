/**
 * ELO Rating System for Match Results
 * 
 * Standard ELO formula used in chess and competitive games
 * K-factor: 32 (standard for most games)
 * Starting rating: 1000
 */

export const K_FACTOR = 32;
export const STARTING_ELO = 1000;

/**
 * Calculate expected probability of winning
 * @param playerRating Current player rating
 * @param opponentRating Opponent's rating
 * @returns Expected probability (0-1)
 */
function expectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculate new ELO ratings after a match
 * @param winnerRating Current winner's rating
 * @param loserRating Current loser's rating
 * @returns Object with new ratings for winner and loser
 */
export function calculateELO(winnerRating: number, loserRating: number): {
    newWinnerRating: number;
    newLoserRating: number;
} {
    // Expected scores
    const expectedWinner = expectedScore(winnerRating, loserRating);
    const expectedLoser = expectedScore(loserRating, winnerRating);
    
    // Actual scores (1 = win, 0 = loss)
    const actualWinner = 1;
    const actualLoser = 0;
    
    // Calculate rating changes
    const winnerChange = K_FACTOR * (actualWinner - expectedWinner);
    const loserChange = K_FACTOR * (actualLoser - expectedLoser);
    
    // New ratings (rounded to nearest integer)
    const newWinnerRating = Math.round(winnerRating + winnerChange);
    const newLoserRating = Math.round(loserRating + loserChange);
    
    return {
        newWinnerRating,
        newLoserRating
    };
}
