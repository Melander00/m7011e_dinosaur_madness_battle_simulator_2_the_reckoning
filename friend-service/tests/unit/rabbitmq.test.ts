/**
 * Unit Tests for RabbitMQ Module
 * Tests the RabbitMQ connection and messaging functions
 */

import { describe, test, expect, jest, beforeEach, it } from '@jest/globals';

// Create mock connection object
const mockConnection = {
  on: jest.fn<any>(),
  close: jest.fn<any>().mockResolvedValue(undefined),
};

// Track if Connection should throw
let shouldThrow = false;
let throwError: Error | null = null;

// Mock rabbitmq-client
jest.mock('rabbitmq-client', () => ({
  Connection: jest.fn().mockImplementation(() => {
    if (shouldThrow && throwError) {
      throw throwError;
    }
    return mockConnection;
  }),
}));

import { connectRabbitMQ, getRabbitMQ, closeRabbitMQ } from '../../src/messaging/rabbitmq';
import { Connection } from 'rabbitmq-client';

describe('RabbitMQ Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    shouldThrow = false;
    throwError = null;
    
    // Reset the mock handlers
    mockConnection.on.mockReset();
    mockConnection.close.mockReset().mockResolvedValue(undefined);
  });

  describe('connectRabbitMQ', () => {
    it('should create a new RabbitMQ connection', async () => {
      const connection = await connectRabbitMQ();

      expect(Connection).toHaveBeenCalled();
      expect(connection).toBe(mockConnection);
    });

    it('should register error handler on connection', async () => {
      await connectRabbitMQ();

      expect(mockConnection.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should register connection handler', async () => {
      await connectRabbitMQ();

      expect(mockConnection.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should use RABBITMQ_URL from environment', async () => {
      // Since the module reads env at import time, we just verify Connection is called
      await connectRabbitMQ();

      // Verify it was called with whatever URL is in env (set in jest.setup.ts)
      expect(Connection).toHaveBeenCalled();
    });

    it('should log success message on connect', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      await connectRabbitMQ();

      expect(consoleSpy).toHaveBeenCalledWith('[friend-service] RabbitMQ connected successfully');
      
      consoleSpy.mockRestore();
    });
  });

  describe('getRabbitMQ', () => {
    it('should return the current connection', async () => {
      await connectRabbitMQ();
      
      const result = getRabbitMQ();

      expect(result).toBe(mockConnection);
    });
  });

  describe('closeRabbitMQ', () => {
    it('should close the connection when connected', async () => {
      await connectRabbitMQ();
      
      await closeRabbitMQ();

      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should log closing message', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      await connectRabbitMQ();
      await closeRabbitMQ();

      expect(consoleSpy).toHaveBeenCalledWith('[friend-service] RabbitMQ connection closed');
      
      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle connection errors via error event', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await connectRabbitMQ();

      // Find the error handler callback
      const errorHandler = mockConnection.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'error'
      )?.[1] as ((err: Error) => void) | undefined;

      expect(errorHandler).toBeDefined();
      
      // Call the error handler
      if (errorHandler) {
        errorHandler(new Error('Test error'));
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[friend-service] RabbitMQ Error: Error: Test error'
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle reconnection events', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      await connectRabbitMQ();

      // Find the connection handler callback
      const connectionHandler = mockConnection.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'connection'
      )?.[1] as (() => void) | undefined;

      expect(connectionHandler).toBeDefined();
      
      // Call the connection handler
      if (connectionHandler) {
        connectionHandler();
      }
      
      expect(consoleSpy).toHaveBeenCalledWith('[friend-service] RabbitMQ connection (re)established');
      
      consoleSpy.mockRestore();
    });
  });

  describe('module state', () => {
    it('should maintain connection instance', async () => {
      const conn1 = await connectRabbitMQ();
      const conn2 = getRabbitMQ();

      expect(conn1).toBe(conn2);
    });

    it('should use environment variable for URL', () => {
      // Test that the module reads from process.env
      expect(process.env.RABBITMQ_URL).toBeDefined();
    });
  });
});
