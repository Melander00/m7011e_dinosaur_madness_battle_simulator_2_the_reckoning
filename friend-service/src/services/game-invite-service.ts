import { getRedisClient } from "../db/redis";

export interface GameInvite {
  inviteId: string;
  fromUserId: string;
  toUserId: string;
  createdAt: number;
  expiresAt: number;
}

// Default invite TTL: 5 minutes
const INVITE_TTL_SECONDS = 300;

// Redis key patterns
const INVITE_KEY = (inviteId: string) => `GAME_INVITE:${inviteId}`;
const USER_SENT_INVITES_KEY = (userId: string) => `USER_SENT_INVITES:${userId}`;
const USER_RECEIVED_INVITES_KEY = (userId: string) => `USER_RECEIVED_INVITES:${userId}`;

function generateInviteId(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export class GameInviteService {
  /**
   * Send a game invite to another user
   */
  async sendInvite(fromUserId: string, toUserId: string): Promise<GameInvite> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis not connected");
    }

    // Check if there's already a pending invite from this user to the target
    const existingInvites = await this.getSentInvites(fromUserId);
    const alreadyInvited = existingInvites.find((inv) => inv.toUserId === toUserId);
    if (alreadyInvited) {
      throw new Error("You already have a pending invite to this user");
    }

    const inviteId = generateInviteId();
    const now = Date.now();
    const invite: GameInvite = {
      inviteId,
      fromUserId,
      toUserId,
      createdAt: now,
      expiresAt: now + INVITE_TTL_SECONDS * 1000,
    };

    // Store the invite with TTL
    await redis.set(INVITE_KEY(inviteId), JSON.stringify(invite), {
      EX: INVITE_TTL_SECONDS,
    });

    // Add to sender's sent invites set (with same TTL)
    await redis.sAdd(USER_SENT_INVITES_KEY(fromUserId), inviteId);
    await redis.expire(USER_SENT_INVITES_KEY(fromUserId), INVITE_TTL_SECONDS);

    // Add to receiver's received invites set (with same TTL)
    await redis.sAdd(USER_RECEIVED_INVITES_KEY(toUserId), inviteId);
    await redis.expire(USER_RECEIVED_INVITES_KEY(toUserId), INVITE_TTL_SECONDS);

    console.log(`[friend-service] Game invite sent: ${fromUserId} -> ${toUserId} (${inviteId})`);
    return invite;
  }

  /**
   * Cancel/revoke a sent invite
   */
  async cancelInvite(inviteId: string, userId: string): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis not connected");
    }

    const invite = await this.getInviteById(inviteId);
    if (!invite) {
      return false; // Invite doesn't exist or already expired
    }

    // Only the sender can cancel the invite
    if (invite.fromUserId !== userId) {
      throw new Error("You can only cancel your own invites");
    }

    await this.deleteInvite(invite);
    console.log(`[friend-service] Game invite cancelled: ${inviteId}`);
    return true;
  }

  /**
   * Get a specific invite by ID
   */
  async getInviteById(inviteId: string): Promise<GameInvite | null> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis not connected");
    }

    const data = await redis.get(INVITE_KEY(inviteId));
    if (!data) return null;

    return JSON.parse(data) as GameInvite;
  }

  /**
   * Get all pending invites sent by a user
   */
  async getSentInvites(userId: string): Promise<GameInvite[]> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis not connected");
    }

    const inviteIds = await redis.sMembers(USER_SENT_INVITES_KEY(userId));
    const invites: GameInvite[] = [];

    for (const inviteId of inviteIds) {
      const invite = await this.getInviteById(inviteId);
      if (invite) {
        invites.push(invite);
      } else {
        // Clean up stale reference
        await redis.sRem(USER_SENT_INVITES_KEY(userId), inviteId);
      }
    }

    return invites;
  }

  /**
   * Get all pending invites received by a user
   */
  async getReceivedInvites(userId: string): Promise<GameInvite[]> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis not connected");
    }

    const inviteIds = await redis.sMembers(USER_RECEIVED_INVITES_KEY(userId));
    const invites: GameInvite[] = [];

    for (const inviteId of inviteIds) {
      const invite = await this.getInviteById(inviteId);
      if (invite) {
        invites.push(invite);
      } else {
        // Clean up stale reference
        await redis.sRem(USER_RECEIVED_INVITES_KEY(userId), inviteId);
      }
    }

    return invites;
  }

  /**
   * Cancel all invites sent by a user (call when user goes offline)
   */
  async cancelAllUserInvites(userId: string): Promise<number> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error("Redis not connected");
    }

    const invites = await this.getSentInvites(userId);
    for (const invite of invites) {
      await this.deleteInvite(invite);
    }

    console.log(`[friend-service] Cancelled ${invites.length} invites for user ${userId}`);
    return invites.length;
  }

  /**
   * Internal helper to delete an invite and clean up references
   */
  private async deleteInvite(invite: GameInvite): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    await Promise.all([
      redis.del(INVITE_KEY(invite.inviteId)),
      redis.sRem(USER_SENT_INVITES_KEY(invite.fromUserId), invite.inviteId),
      redis.sRem(USER_RECEIVED_INVITES_KEY(invite.toUserId), invite.inviteId),
    ]);
  }
}

export const gameInviteService = new GameInviteService();
