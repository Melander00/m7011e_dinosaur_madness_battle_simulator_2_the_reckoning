/**
 * Unit Tests for Database Module (db.ts)
 * Tests the database query helper and health check functions
 */

import { describe, test, expect, jest, beforeEach, it } from '@jest/globals';
import { Pool, QueryResult } from 'pg';

// Mock the pg module before importing db
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mockPool),
  };
});

describe('Database Module', () => {
  let mockPool: any;
  let dbModule: typeof import('../../src/db');

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset module cache to get fresh imports
    jest.resetModules();
    
    // Get the mock pool instance
    const { Pool } = require('pg');
    mockPool = new Pool();
    
    // Re-import the db module after mocking
    dbModule = require('../../src/db');
  });

  describe('pool configuration', () => {
    it('should create a Pool instance', () => {
      const { Pool } = require('pg');
      expect(Pool).toHaveBeenCalled();
    });

    it('should export the pool', () => {
      expect(dbModule.pool).toBeDefined();
    });
  });

  describe('query function', () => {
    it('should execute a query and return results', async () => {
      const mockResult: QueryResult = {
        rows: [{ id: 1, name: 'test' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await dbModule.query('SELECT * FROM test');

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM test', undefined);
      expect(result).toEqual(mockResult);
    });

    it('should pass parameters to the query', async () => {
      const mockResult: QueryResult = {
        rows: [{ id: 1 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };
      mockPool.query.mockResolvedValue(mockResult);

      await dbModule.query('SELECT * FROM users WHERE id = $1', ['user-123']);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        ['user-123']
      );
    });

    it('should propagate database errors', async () => {
      const dbError = new Error('Connection refused');
      mockPool.query.mockRejectedValue(dbError);

      await expect(dbModule.query('SELECT * FROM test')).rejects.toThrow('Connection refused');
    });

    it('should handle empty result sets', async () => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await dbModule.query('SELECT * FROM empty_table');

      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('should handle INSERT queries with rowCount', async () => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await dbModule.query(
        'INSERT INTO users (id) VALUES ($1)',
        ['new-user']
      );

      expect(result.rowCount).toBe(1);
    });

    it('should handle DELETE queries', async () => {
      const mockResult: QueryResult = {
        rows: [],
        rowCount: 3,
        command: 'DELETE',
        oid: 0,
        fields: [],
      };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await dbModule.query('DELETE FROM users WHERE active = false');

      expect(result.rowCount).toBe(3);
    });
  });

  describe('healthCheck function', () => {
    it('should return healthy status when database is accessible', async () => {
      const mockTime = new Date('2025-01-05T12:00:00Z');
      mockPool.query.mockResolvedValue({
        rows: [{ time: mockTime }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await dbModule.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.time).toEqual(mockTime);
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy status when database is inaccessible', async () => {
      mockPool.query.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await dbModule.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('ECONNREFUSED');
      expect(result.time).toBeUndefined();
    });

    it('should return unhealthy status on timeout', async () => {
      mockPool.query.mockRejectedValue(new Error('Query timeout'));

      const result = await dbModule.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Query timeout');
    });

    it('should handle unexpected error types', async () => {
      mockPool.query.mockRejectedValue({ code: 'UNKNOWN' });

      const result = await dbModule.healthCheck();

      expect(result.status).toBe('unhealthy');
    });
  });
});
