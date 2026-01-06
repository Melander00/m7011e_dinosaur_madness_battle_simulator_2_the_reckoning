import type { QueryResult } from 'pg';
import * as rankRepository from '../../src/repositories/rankRepository';

// Mock the query function from db
jest.mock('../../src/db', () => ({
  query: jest.fn(),
}));

import { query as mockQuery } from '../../src/db';

describe('RankRepository', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getTop', () => {
    test('should return top N players ordered by rank', async () => {
      // Arrange
      const mockRows = [
        { rank: 1, userid: 'user-1', rankedpoints: 1800 },
        { rank: 2, userid: 'user-2', rankedpoints: 1650 },
        { rank: 3, userid: 'user-3', rankedpoints: 1500 },
      ];

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: mockRows,
        command: 'SELECT',
        rowCount: 3,
        oid: 0,
        fields: [],
      } as QueryResult);

      // Act
      const result = await rankRepository.getTop(3);

      // Assert
      expect(result).toEqual(mockRows);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [3]
      );
    });

    test('should enforce maximum limit of 100', async () => {
      // Arrange
      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as QueryResult);

      // Act
      await rankRepository.getTop(500);

      // Assert
      // Should call with capped limit
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [100] // Capped at 100
      );
    });

    test('should return empty array when no players exist', async () => {
      // Arrange
      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as QueryResult);

      // Act
      const result = await rankRepository.getTop(10);

      // Assert
      expect(result).toEqual([]);
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      (mockQuery as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

      // Act & Assert
      await expect(rankRepository.getTop(10)).rejects.toThrow('Database connection failed');
    });
  });

  describe('getMe', () => {
    test('should return user rank when user exists', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const mockRow = {
        rank: 5,
        userid: userId,
        rankedpoints: 1400,
      };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [mockRow],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as QueryResult);

      // Act
      const result = await rankRepository.getMe(userId);

      // Assert
      expect(result).toEqual(mockRow);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE userid ='),
        [userId]
      );
    });

    test('should return null when user does not exist', async () => {
      // Arrange
      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as QueryResult);

      // Act
      const result = await rankRepository.getMe('non-existent-user');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getNearby', () => {
    test('should return nearby players within range', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const range = 2;
      const mockRows = [
        { rank: 3, userid: 'user-3', rankedpoints: 1500 },
        { rank: 4, userid: 'user-4', rankedpoints: 1450 },
        { rank: 5, userid: userId, rankedpoints: 1400 },
        { rank: 6, userid: 'user-6', rankedpoints: 1350 },
        { rank: 7, userid: 'user-7', rankedpoints: 1300 },
      ];

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: mockRows,
        command: 'SELECT',
        rowCount: 5,
        oid: 0,
        fields: [],
      } as QueryResult);

      // Act
      const result = await rankRepository.getNearby(userId, range);

      // Assert
      expect(result).toEqual(mockRows);
      expect(result.length).toBe(5); // 2 above + user + 2 below
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('BETWEEN'),
        [userId, range]
      );
    });

    test('should cap range at 50', async () => {
      // Arrange
      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as QueryResult);

      // Act
      await rankRepository.getNearby('user-id', 100);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['user-id', 50] // Capped at 50
      );
    });

    test('should return empty array when user not found', async () => {
      // Arrange
      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as QueryResult);

      // Act
      const result = await rankRepository.getNearby('non-existent', 5);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
