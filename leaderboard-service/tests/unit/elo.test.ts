import { calculateELO, K_FACTOR } from '../../src/elo';

describe('ELO Calculation', () => {
  describe('calculateELO', () => {
    test('should calculate correct ELO for winner vs loser with equal ratings', () => {
      // Arrange
      const winnerRating = 1500;
      const loserRating = 1500;

      // Act
      const result = calculateELO(winnerRating, loserRating);

      // Assert
      expect(result.newWinnerRating).toBe(1516); // Winner gains 16 points (50% expected, 100% actual)
      expect(result.newLoserRating).toBe(1484); // Loser loses 16 points
      expect(result.newWinnerRating - winnerRating).toBe(-(result.newLoserRating - loserRating));
    });

    test('should calculate correct ELO when higher rated player wins', () => {
      // Arrange
      const winnerRating = 1800;
      const loserRating = 1200;

      // Act
      const result = calculateELO(winnerRating, loserRating);

      // Assert
      expect(result.newWinnerRating).toBeGreaterThan(winnerRating);
      expect(result.newLoserRating).toBeLessThan(loserRating);
      // Higher rated player should gain fewer points (expected to win)
      expect(result.newWinnerRating - winnerRating).toBeLessThan(16);
    });

    test('should calculate correct ELO when lower rated player wins (upset)', () => {
      // Arrange
      const winnerRating = 1200;
      const loserRating = 1800;

      // Act
      const result = calculateELO(winnerRating, loserRating);

      // Assert
      expect(result.newWinnerRating).toBeGreaterThan(winnerRating);
      expect(result.newLoserRating).toBeLessThan(loserRating);
      // Lower rated player should gain more points (upset victory)
      expect(result.newWinnerRating - winnerRating).toBeGreaterThan(16);
    });

    test('should return integer ratings', () => {
      // Arrange
      const rating1 = 1537;
      const rating2 = 1423;

      // Act
      const result = calculateELO(rating1, rating2);

      // Assert
      expect(Number.isInteger(result.newWinnerRating)).toBe(true);
      expect(Number.isInteger(result.newLoserRating)).toBe(true);
    });

    test('should use K-factor of 32', () => {
      // Arrange
      const rating1 = 1500;
      const rating2 = 1500;

      // Act
      const result = calculateELO(rating1, rating2);

      // Assert
      // With equal ratings and a win, change should be K * 0.5 = 32 * 0.5 = 16
      expect(result.newWinnerRating - rating1).toBe(K_FACTOR * 0.5);
    });

    test('should handle minimum rating (edge case)', () => {
      // Arrange
      const winnerRating = 100;
      const loserRating = 100;

      // Act
      const result = calculateELO(winnerRating, loserRating);

      // Assert
      expect(result.newWinnerRating).toBeGreaterThan(winnerRating);
      expect(result.newLoserRating).toBeLessThan(loserRating);
      expect(result.newLoserRating).toBeGreaterThanOrEqual(0);
    });

    test('should handle very high ratings', () => {
      // Arrange
      const winnerRating = 3000;
      const loserRating = 2800;

      // Act
      const result = calculateELO(winnerRating, loserRating);

      // Assert
      expect(result.newWinnerRating).toBeGreaterThan(winnerRating);
      expect(result.newLoserRating).toBeLessThan(loserRating);
      expect(result.newWinnerRating).toBeLessThan(10000); // Sanity check
    });

    test('should be symmetric (total rating points conserved)', () => {
      // Arrange
      const rating1 = 1456;
      const rating2 = 1823;

      // Act
      const result = calculateELO(rating1, rating2);

      // Assert
      const initialTotal = rating1 + rating2;
      const finalTotal = result.newWinnerRating + result.newLoserRating;
      // Total points should be conserved (within rounding error)
      expect(Math.abs(finalTotal - initialTotal)).toBeLessThanOrEqual(1);
    });

    test('should expect 50% win rate for equal ratings', () => {
      const rating1 = 1500;
      const rating2 = 1500;
      const result = calculateELO(rating1, rating2);
      
      // Winner should gain exactly K/2 points
      expect(result.newWinnerRating - rating1).toBe(K_FACTOR / 2);
    });

    test('should expect higher win rate for higher rated player', () => {
      const higherRating = 2000;
      const lowerRating = 1000;
      const result = calculateELO(higherRating, lowerRating);
      
      // Higher rated player winning should gain fewer points (expected outcome)
      expect(result.newWinnerRating - higherRating).toBeLessThan(K_FACTOR / 2);
    });
  });
});
