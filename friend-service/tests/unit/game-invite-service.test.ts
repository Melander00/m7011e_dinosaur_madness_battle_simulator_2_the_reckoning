/**
 * Unit Tests for Game Invite Service
 * Tests all game invite functionality with mocked Redis
 */

import { describe, test, expect, jest, beforeEach, it } from '@jest/globals';

// Mock Redis client
const mockRedisGet = jest.fn<any>();
const mockRedisSet = jest.fn<any>();
const mockRedisDel = jest.fn<any>();
const mockRedisSAdd = jest.fn<any>();
const mockRedisSRem = jest.fn<any>();
const mockRedisSMembers = jest.fn<any>();
const mockRedisExpire = jest.fn<any>();

const mockRedisClient = {
  get: mockRedisGet,
  set: mockRedisSet,
  del: mockRedisDel,
  sAdd: mockRedisSAdd,
  sRem: mockRedisSRem,
  sMembers: mockRedisSMembers,
  expire: mockRedisExpire,
};

jest.mock('../../src/db/redis', () => ({
  getRedisClient: () => mockRedisClient,
}));

import { GameInviteService, GameInvite } from '../../src/services/game-invite-service';

describe('GameInviteService', () => {
  let service: GameInviteService;
  const fromUserId = '11111111-1111-1111-1111-111111111111';
  const toUserId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GameInviteService();
    
    // Default mock implementations
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue('OK');
    mockRedisDel.mockResolvedValue(1);
    mockRedisSAdd.mockResolvedValue(1);
    mockRedisSRem.mockResolvedValue(1);
    mockRedisSMembers.mockResolvedValue([]);
    mockRedisExpire.mockResolvedValue(true);
  });

  describe('sendInvite', () => {
    it('should create and store a new game invite', async () => {
      const invite = await service.sendInvite(fromUserId, toUserId);

      expect(invite).toBeDefined();
      expect(invite.fromUserId).toBe(fromUserId);
      expect(invite.toUserId).toBe(toUserId);
      expect(invite.inviteId).toMatch(/^inv_\d+_[a-z0-9]+$/);
      expect(invite.createdAt).toBeDefined();
      expect(invite.expiresAt).toBeGreaterThan(invite.createdAt);
    });

    it('should store invite in Redis with TTL', async () => {
      await service.sendInvite(fromUserId, toUserId);

      expect(mockRedisSet).toHaveBeenCalledWith(
        expect.stringContaining('GAME_INVITE:'),
        expect.any(String),
        { EX: 300 }
      );
    });

    it('should add invite to sender sent invites set', async () => {
      await service.sendInvite(fromUserId, toUserId);

      expect(mockRedisSAdd).toHaveBeenCalledWith(
        `USER_SENT_INVITES:${fromUserId}`,
        expect.stringContaining('inv_')
      );
    });

    it('should add invite to receiver received invites set', async () => {
      await service.sendInvite(fromUserId, toUserId);

      expect(mockRedisSAdd).toHaveBeenCalledWith(
        `USER_RECEIVED_INVITES:${toUserId}`,
        expect.stringContaining('inv_')
      );
    });

    it('should throw error if user already has pending invite to same user', async () => {
      const existingInvite: GameInvite = {
        inviteId: 'inv_existing',
        fromUserId,
        toUserId,
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      mockRedisSMembers.mockResolvedValueOnce(['inv_existing']);
      mockRedisGet.mockResolvedValueOnce(JSON.stringify(existingInvite));

      await expect(service.sendInvite(fromUserId, toUserId)).rejects.toThrow(
        'You already have a pending invite to this user'
      );
    });
  });

  describe('cancelInvite', () => {
    const inviteId = 'inv_test_123';
    const invite: GameInvite = {
      inviteId,
      fromUserId,
      toUserId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 300000,
    };

    it('should cancel an existing invite owned by user', async () => {
      mockRedisGet.mockResolvedValueOnce(JSON.stringify(invite));

      const result = await service.cancelInvite(inviteId, fromUserId);

      expect(result).toBe(true);
      expect(mockRedisDel).toHaveBeenCalledWith(`GAME_INVITE:${inviteId}`);
    });

    it('should return false if invite does not exist', async () => {
      mockRedisGet.mockResolvedValueOnce(null);

      const result = await service.cancelInvite(inviteId, fromUserId);

      expect(result).toBe(false);
    });

    it('should throw error if user tries to cancel invite they did not send', async () => {
      mockRedisGet.mockResolvedValueOnce(JSON.stringify(invite));

      await expect(
        service.cancelInvite(inviteId, 'other-user-id')
      ).rejects.toThrow('You can only cancel your own invites');
    });

    it('should clean up all references when cancelling', async () => {
      mockRedisGet.mockResolvedValueOnce(JSON.stringify(invite));

      await service.cancelInvite(inviteId, fromUserId);

      expect(mockRedisDel).toHaveBeenCalledWith(`GAME_INVITE:${inviteId}`);
      expect(mockRedisSRem).toHaveBeenCalledWith(`USER_SENT_INVITES:${fromUserId}`, inviteId);
      expect(mockRedisSRem).toHaveBeenCalledWith(`USER_RECEIVED_INVITES:${toUserId}`, inviteId);
    });
  });

  describe('getInviteById', () => {
    const inviteId = 'inv_test_123';
    const invite: GameInvite = {
      inviteId,
      fromUserId,
      toUserId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 300000,
    };

    it('should return invite when it exists', async () => {
      mockRedisGet.mockResolvedValueOnce(JSON.stringify(invite));

      const result = await service.getInviteById(inviteId);

      expect(result).toEqual(invite);
      expect(mockRedisGet).toHaveBeenCalledWith(`GAME_INVITE:${inviteId}`);
    });

    it('should return null when invite does not exist', async () => {
      mockRedisGet.mockResolvedValueOnce(null);

      const result = await service.getInviteById(inviteId);

      expect(result).toBeNull();
    });
  });

  describe('getSentInvites', () => {
    it('should return empty array when user has no sent invites', async () => {
      mockRedisSMembers.mockResolvedValueOnce([]);

      const result = await service.getSentInvites(fromUserId);

      expect(result).toEqual([]);
    });

    it('should return all sent invites', async () => {
      const invite1: GameInvite = {
        inviteId: 'inv_1',
        fromUserId,
        toUserId: 'user-a',
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };
      const invite2: GameInvite = {
        inviteId: 'inv_2',
        fromUserId,
        toUserId: 'user-b',
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      mockRedisSMembers.mockResolvedValueOnce(['inv_1', 'inv_2']);
      mockRedisGet
        .mockResolvedValueOnce(JSON.stringify(invite1))
        .mockResolvedValueOnce(JSON.stringify(invite2));

      const result = await service.getSentInvites(fromUserId);

      expect(result).toHaveLength(2);
      expect(result[0].inviteId).toBe('inv_1');
      expect(result[1].inviteId).toBe('inv_2');
    });

    it('should clean up stale references', async () => {
      mockRedisSMembers.mockResolvedValueOnce(['inv_stale']);
      mockRedisGet.mockResolvedValueOnce(null); // Invite expired

      const result = await service.getSentInvites(fromUserId);

      expect(result).toEqual([]);
      expect(mockRedisSRem).toHaveBeenCalledWith(
        `USER_SENT_INVITES:${fromUserId}`,
        'inv_stale'
      );
    });
  });

  describe('getReceivedInvites', () => {
    it('should return empty array when user has no received invites', async () => {
      mockRedisSMembers.mockResolvedValueOnce([]);

      const result = await service.getReceivedInvites(toUserId);

      expect(result).toEqual([]);
    });

    it('should return all received invites', async () => {
      const invite: GameInvite = {
        inviteId: 'inv_1',
        fromUserId,
        toUserId,
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      mockRedisSMembers.mockResolvedValueOnce(['inv_1']);
      mockRedisGet.mockResolvedValueOnce(JSON.stringify(invite));

      const result = await service.getReceivedInvites(toUserId);

      expect(result).toHaveLength(1);
      expect(result[0].fromUserId).toBe(fromUserId);
    });

    it('should clean up stale references', async () => {
      mockRedisSMembers.mockResolvedValueOnce(['inv_stale']);
      mockRedisGet.mockResolvedValueOnce(null);

      const result = await service.getReceivedInvites(toUserId);

      expect(result).toEqual([]);
      expect(mockRedisSRem).toHaveBeenCalledWith(
        `USER_RECEIVED_INVITES:${toUserId}`,
        'inv_stale'
      );
    });
  });

  describe('cancelAllUserInvites', () => {
    it('should return 0 when user has no invites', async () => {
      mockRedisSMembers.mockResolvedValueOnce([]);

      const count = await service.cancelAllUserInvites(fromUserId);

      expect(count).toBe(0);
    });

    it('should cancel all sent invites and return count', async () => {
      const invite1: GameInvite = {
        inviteId: 'inv_1',
        fromUserId,
        toUserId: 'user-a',
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };
      const invite2: GameInvite = {
        inviteId: 'inv_2',
        fromUserId,
        toUserId: 'user-b',
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
      };

      mockRedisSMembers.mockResolvedValueOnce(['inv_1', 'inv_2']);
      mockRedisGet
        .mockResolvedValueOnce(JSON.stringify(invite1))
        .mockResolvedValueOnce(JSON.stringify(invite2));

      const count = await service.cancelAllUserInvites(fromUserId);

      expect(count).toBe(2);
      expect(mockRedisDel).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should throw error when Redis is not connected in sendInvite', async () => {
      jest.resetModules();
      jest.doMock('../../src/db/redis', () => ({
        getRedisClient: () => null,
      }));
      
      const { GameInviteService } = require('../../src/services/game-invite-service');
      const serviceWithNoRedis = new GameInviteService();

      await expect(serviceWithNoRedis.sendInvite(fromUserId, toUserId)).rejects.toThrow(
        'Redis not connected'
      );
    });

    it('should throw error when Redis is not connected in getInviteById', async () => {
      jest.resetModules();
      jest.doMock('../../src/db/redis', () => ({
        getRedisClient: () => null,
      }));
      
      const { GameInviteService } = require('../../src/services/game-invite-service');
      const serviceWithNoRedis = new GameInviteService();

      await expect(serviceWithNoRedis.getInviteById('inv_test')).rejects.toThrow(
        'Redis not connected'
      );
    });

    it('should throw error when Redis is not connected in getSentInvites', async () => {
      jest.resetModules();
      jest.doMock('../../src/db/redis', () => ({
        getRedisClient: () => null,
      }));
      
      const { GameInviteService } = require('../../src/services/game-invite-service');
      const serviceWithNoRedis = new GameInviteService();

      await expect(serviceWithNoRedis.getSentInvites(fromUserId)).rejects.toThrow(
        'Redis not connected'
      );
    });

    it('should throw error when Redis is not connected in getReceivedInvites', async () => {
      jest.resetModules();
      jest.doMock('../../src/db/redis', () => ({
        getRedisClient: () => null,
      }));
      
      const { GameInviteService } = require('../../src/services/game-invite-service');
      const serviceWithNoRedis = new GameInviteService();

      await expect(serviceWithNoRedis.getReceivedInvites(toUserId)).rejects.toThrow(
        'Redis not connected'
      );
    });

    it('should throw error when Redis is not connected in cancelInvite', async () => {
      jest.resetModules();
      jest.doMock('../../src/db/redis', () => ({
        getRedisClient: () => null,
      }));
      
      const { GameInviteService } = require('../../src/services/game-invite-service');
      const serviceWithNoRedis = new GameInviteService();

      await expect(serviceWithNoRedis.cancelInvite('inv_test', fromUserId)).rejects.toThrow(
        'Redis not connected'
      );
    });

    it('should throw error when Redis is not connected in cancelAllUserInvites', async () => {
      jest.resetModules();
      jest.doMock('../../src/db/redis', () => ({
        getRedisClient: () => null,
      }));
      
      const { GameInviteService } = require('../../src/services/game-invite-service');
      const serviceWithNoRedis = new GameInviteService();

      await expect(serviceWithNoRedis.cancelAllUserInvites(fromUserId)).rejects.toThrow(
        'Redis not connected'
      );
    });
  });
});
