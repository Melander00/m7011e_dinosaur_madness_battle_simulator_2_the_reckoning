/**
 * Unit Tests for RabbitMQ Consumer
 * Tests match result processing, validation, and ELO updates
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock dependencies before importing
jest.mock('../../src/db');
jest.mock('../../src/elo', () => ({
  calculateELO: jest.fn(),
  STARTING_ELO: 1500,
}));

import { query } from '../../src/db';
import { calculateELO, STARTING_ELO } from '../../src/elo';
import { processLeaderboardMatchResult, MatchResultMessage } from '../../src/rabbitmq-consumer';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockCalculateELO = calculateELO as jest.MockedFunction<typeof calculateELO>;

describe('RabbitMQ Consumer Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Message Processing - Validation', () => {
    test('RMQ 1: should reject message without winnerId', async () => {
      const message = {
        winnerId: '',
        loserId: 'loser-123',
        matchId: 'match-1',
        timestamp: Date.now(),
        ranked: true,
      } as MatchResultMessage;

      await expect(processLeaderboardMatchResult(message)).rejects.toThrow(
        'Invalid match result: winnerId and loserId are required'
      );
    });

    test('RMQ 2: should reject message without loserId', async () => {
      const message = {
        winnerId: 'winner-123',
        loserId: '',
        matchId: 'match-1',
        timestamp: Date.now(),
        ranked: true,
      } as MatchResultMessage;

      await expect(processLeaderboardMatchResult(message)).rejects.toThrow(
        'Invalid match result: winnerId and loserId are required'
      );
    });

    test('RMQ 3: should reject message without matchId', async () => {
      const message = {
        winnerId: 'winner-123',
        loserId: 'loser-123',
        matchId: '',
        timestamp: Date.now(),
        ranked: true,
      } as MatchResultMessage;

      await expect(processLeaderboardMatchResult(message)).rejects.toThrow(
        'Invalid match result: matchId is required'
      );
    });

    test('RMQ 4: should reject message when winner and loser are same', async () => {
      const message = {
        winnerId: 'player-123',
        loserId: 'player-123',
        matchId: 'match-1',
        timestamp: Date.now(),
        ranked: true,
      } as MatchResultMessage;

      await expect(processLeaderboardMatchResult(message)).rejects.toThrow(
        'Invalid match result: Winner and loser cannot be the same player'
      );
    });

    test('RMQ 5: should skip unranked matches', async () => {
      const message = {
        winnerId: 'winner-123',
        loserId: 'loser-123',
        matchId: 'match-1',
        timestamp: Date.now(),
        ranked: false,
      } as MatchResultMessage;

      await processLeaderboardMatchResult(message);

      // Should not query DB for unranked matches
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('Message Processing - ELO Updates', () => {
    test('RMQ 6: should process ranked match for existing players', async () => {
      const message = {
        winnerId: 'winner-123',
        loserId: 'loser-123',
        matchId: 'match-1',
        timestamp: Date.now(),
        ranked: true,
      } as MatchResultMessage;

      // Mock existing players with ratings
      mockQuery.mockResolvedValueOnce({
        rows: [
          { userid: 'winner-123', rankedpoints: 1600 },
          { userid: 'loser-123', rankedpoints: 1400 },
        ],
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: [],
      } as any);

      mockCalculateELO.mockReturnValueOnce({
        newWinnerRating: 1620,
        newLoserRating: 1380,
      });

      // Mock upserts
      mockQuery.mockResolvedValueOnce({ rows: [], command: 'INSERT', rowCount: 1, oid: 0, fields: [] } as any);
      mockQuery.mockResolvedValueOnce({ rows: [], command: 'INSERT', rowCount: 1, oid: 0, fields: [] } as any);

      await processLeaderboardMatchResult(message);

      // Verify ratings query
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        'SELECT userid, rankedpoints FROM ranks WHERE userid = ANY($1::uuid[])',
        [['winner-123', 'loser-123']]
      );

      // Verify ELO calculation
      expect(mockCalculateELO).toHaveBeenCalledWith(1600, 1400);

      // Verify winner update
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO ranks'),
        ['winner-123', 1620]
      );

      // Verify loser update
      expect(mockQuery).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO ranks'),
        ['loser-123', 1380]
      );
    });

    test('RMQ 7: should use STARTING_ELO for new winner', async () => {
      const message = {
        winnerId: 'new-winner',
        loserId: 'existing-loser',
        matchId: 'match-2',
        timestamp: Date.now(),
        ranked: true,
      } as MatchResultMessage;

      // Only loser exists in DB
      mockQuery.mockResolvedValueOnce({
        rows: [{ userid: 'existing-loser', rankedpoints: 1400 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      mockCalculateELO.mockReturnValueOnce({
        newWinnerRating: 1520,
        newLoserRating: 1380,
      });

      mockQuery.mockResolvedValue({ rows: [], command: 'INSERT', rowCount: 1, oid: 0, fields: [] } as any);

      await processLeaderboardMatchResult(message);

      // Verify new winner gets STARTING_ELO
      expect(mockCalculateELO).toHaveBeenCalledWith(1500, 1400);
    });

    test('RMQ 8: should use STARTING_ELO for new loser', async () => {
      const message = {
        winnerId: 'existing-winner',
        loserId: 'new-loser',
        matchId: 'match-3',
        timestamp: Date.now(),
        ranked: true,
      } as MatchResultMessage;

      // Only winner exists in DB
      mockQuery.mockResolvedValueOnce({
        rows: [{ userid: 'existing-winner', rankedpoints: 1600 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      mockCalculateELO.mockReturnValueOnce({
        newWinnerRating: 1620,
        newLoserRating: 1480,
      });

      mockQuery.mockResolvedValue({ rows: [], command: 'INSERT', rowCount: 1, oid: 0, fields: [] } as any);

      await processLeaderboardMatchResult(message);

      // Verify new loser gets STARTING_ELO
      expect(mockCalculateELO).toHaveBeenCalledWith(1600, 1500);
    });

    test('RMQ 9: should use STARTING_ELO for both new players', async () => {
      const message = {
        winnerId: 'new-winner',
        loserId: 'new-loser',
        matchId: 'match-4',
        timestamp: Date.now(),
        ranked: true,
      } as MatchResultMessage;

      // No players exist in DB
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      mockCalculateELO.mockReturnValueOnce({
        newWinnerRating: 1520,
        newLoserRating: 1480,
      });

      mockQuery.mockResolvedValue({ rows: [], command: 'INSERT', rowCount: 1, oid: 0, fields: [] } as any);

      await processLeaderboardMatchResult(message);

      // Verify both players get STARTING_ELO
      expect(mockCalculateELO).toHaveBeenCalledWith(1500, 1500);
    });

    test('RMQ 10: should handle database errors gracefully', async () => {
      const message = {
        winnerId: 'winner-123',
        loserId: 'loser-123',
        matchId: 'match-5',
        timestamp: Date.now(),
        ranked: true,
      } as MatchResultMessage;

      mockQuery.mockRejectedValueOnce(new Error('Database connection lost'));

      await expect(processLeaderboardMatchResult(message)).rejects.toThrow('Database connection lost');
    });
  });
});
