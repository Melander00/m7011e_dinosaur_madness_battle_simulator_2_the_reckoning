/**
 * Unit Tests for Redis Module
 * Tests Redis connection and client management
 */

import { describe, test, expect, jest, beforeEach, afterEach, it } from '@jest/globals';

// Mock redis before importing
const mockConnect = jest.fn<any>();
const mockQuit = jest.fn<any>();
const mockOn = jest.fn<any>();

const mockClient = {
  isOpen: false,
  connect: mockConnect,
  quit: mockQuit,
  on: mockOn,
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockClient),
}));

describe('Redis Module', () => {
  let redisModule: typeof import('../../src/db/redis');

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.isOpen = false;
    mockConnect.mockResolvedValue(undefined);
    mockQuit.mockResolvedValue(undefined);
    
    // Clear the module cache to get a fresh instance
    jest.resetModules();
    redisModule = require('../../src/db/redis');
  });

  describe('initRedis', () => {
    it('should connect to Redis and return the client', async () => {
      const client = await redisModule.initRedis();
      
      expect(mockConnect).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    it('should return existing client if already connected', async () => {
      // First connection
      await redisModule.initRedis();
      mockClient.isOpen = true;
      
      // Second call should not reconnect
      mockConnect.mockClear();
      await redisModule.initRedis();
      
      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('should set up error and connect event handlers', () => {
      // The module sets up handlers on import
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
    });
  });

  describe('closeRedis', () => {
    it('should close Redis connection when connected', async () => {
      await redisModule.initRedis();
      mockClient.isOpen = true;
      
      await redisModule.closeRedis();
      
      expect(mockQuit).toHaveBeenCalled();
    });

    it('should do nothing when not connected', async () => {
      mockClient.isOpen = false;
      
      await redisModule.closeRedis();
      
      expect(mockQuit).not.toHaveBeenCalled();
    });
  });

  describe('getRedisClient', () => {
    it('should return undefined before initialization', () => {
      const client = redisModule.getRedisClient();
      expect(client).toBeUndefined();
    });

    it('should return client after initialization', async () => {
      await redisModule.initRedis();
      const client = redisModule.getRedisClient();
      expect(client).toBeDefined();
    });
  });
});
