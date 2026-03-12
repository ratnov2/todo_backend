import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, FriendshipStatus } from '@prisma/client';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { userSelect } from 'src/users/select/user.select';

@Injectable()
export class FriendsService {
  constructor(private db: PrismaService) {}

  private async findUserById(id: number) {
    return this.db.user.findUnique({ where: { id } });
  }
  private async findUserByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  // Отправить запрос
  async sendRequest(senderId: number, dto: CreateFriendRequestDto) {
    const { friendId } = dto;
    const friend = await this.findUserById(friendId);

    if (!friend) throw new NotFoundException('Target user not found');
    if (friend.id === senderId)
      throw new BadRequestException('Cannot send friend request to yourself');

    // check if any blocking exists in either direction
    const block = await this.db.friendship.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: friend.id, status: 'blocked' },
          { userId: friend.id, friendId: senderId, status: 'blocked' },
        ],
      },
    });
    if (block) throw new ForbiddenException('Friendship not allowed (blocked)');

    // check for existing friendship in either direction
    const existing = await this.db.friendship.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: friend.id },
          { userId: friend.id, friendId: senderId },
        ],
      },
    });

    // If reversed pending exists (friend already sent to me), accept that
    if (
      existing &&
      existing.userId === friend.id &&
      existing.friendId === senderId
    ) {
      if (existing.status === 'pending') {
        // accept the reversed one
        const updated = await this.db.friendship.update({
          where: { id: existing.id },
          data: { status: 'accepted' },
        });
        return updated;
      }
      if (existing.status === 'accepted')
        throw new ConflictException('You are already friends');
      if (existing.status === 'blocked')
        throw new ForbiddenException('Friendship blocked');
    }

    // If there's any existing record (same direction) handle
    if (existing) {
      if (existing.userId === senderId && existing.friendId === friend.id) {
        if (existing.status === 'pending')
          throw new ConflictException('Friend request already sent');
        if (existing.status === 'accepted')
          throw new ConflictException('You are already friends');
        if (existing.status === 'blocked')
          throw new ForbiddenException('You are blocked');
      }
    }

    // Create new pending friendship. Use try/catch to handle unique constraint race.
    try {
      const created = await this.db.friendship.create({
        data: {
          userId: senderId,
          friendId: friend.id,
          status: 'pending',
        },
      });
      // TODO: push notification to friend
      return created;
    } catch (err) {
      // Prisma unique constraint (race): handle gracefully
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Friend request already exists (race)');
      }
      throw err;
    }
  }

  // Принять запрос
  async acceptRequest(currentUserId: number, friendshipId: number) {
    const f = await this.db.friendship.findUnique({
      where: { id: friendshipId },
    });
    if (!f) throw new NotFoundException('Friend request not found');
    if (f.friendId !== currentUserId)
      throw new ForbiddenException('Not allowed to accept this request');
    if (f.status !== 'pending')
      throw new BadRequestException('Request is not pending');

    const updated = await this.db.friendship.update({
      where: { id: friendshipId },
      data: { status: 'accepted' },
    });

    // Optionally: create activity feed / notify
    return updated;
  }

  // Отклонить запрос
  async rejectRequest(currentUserId: number, friendshipId: number) {
    const f = await this.db.friendship.findUnique({
      where: { id: friendshipId },
    });
    if (!f) throw new NotFoundException('Friend request not found');
    if (f.friendId !== currentUserId && f.userId !== currentUserId)
      throw new ForbiddenException('Not allowed');
    if (f.status !== 'pending')
      throw new BadRequestException('Request not pending');

    // Можно либо delete, либо set status=rejected. Я рекомендую set status=rejected чтобы хранить историю.
    return this.db.friendship.update({
      where: { id: friendshipId },
      data: { status: 'rejected' },
    });
  }

  // Отмена отправленного запроса
  async cancelRequest(senderId: number, friendshipId: number) {
    const f = await this.db.friendship.findUnique({
      where: { id: friendshipId },
    });
    if (!f) throw new NotFoundException('Request not found');
    if (f.userId !== senderId)
      throw new ForbiddenException('Not allowed to cancel');
    if (f.status !== 'pending')
      throw new BadRequestException('Can only cancel pending requests');

    return this.db.friendship.delete({ where: { id: friendshipId } });
  }

  // Удалить друга (unfriend)
  async removeFriend(userId: number, friendshipId: number) {
    const f = await this.db.friendship.findUnique({
      where: { id: friendshipId },
    });
    if (!f) throw new NotFoundException('Friendship not found');
    // Only participants can remove. Allow either side to remove.
    if (f.userId !== userId && f.friendId !== userId)
      throw new ForbiddenException('Not allowed');
    if (f.status !== 'accepted')
      throw new BadRequestException('Can only remove accepted friendship');

    // delete record (or mark cancelled)
    return this.db.friendship.delete({ where: { id: friendshipId } });
  }

  // Block: creates or updates a friendship record with status blocked
  async blockUser(userId: number, targetId: number) {
    if (userId === targetId)
      throw new BadRequestException('Cannot block yourself');

    // upsert: либо обновим существующую запись, либо создадим новую
    const rec = await this.db.friendship
      .upsert({
        where: { userId_friendId: { userId, friendId: targetId } }, // requires composite unique in schema; если нет, fallback:
        create: { userId, friendId: targetId, status: 'blocked' },
        update: { status: 'blocked' },
      })
      .catch(async (err) => {
        // Если в схеме нет compound unique input, fallback: try findFirst then create/update in tx
        if (err.message.includes('Unknown arg `userId_friendId`')) {
          return this.db.$transaction(async (tx) => {
            const existing = await tx.friendship.findFirst({
              where: { userId, friendId: targetId },
            });
            if (existing)
              return tx.friendship.update({
                where: { id: existing.id },
                data: { status: 'blocked' },
              });
            return tx.friendship.create({
              data: { userId, friendId: targetId, status: 'blocked' },
            });
          });
        }
        throw err;
      });

    // Optional: remove/mark any reverse accepted friendship? (If opposite accepted exists, you may want to set it to blocked as well)
    // e.g. set the reverse to blocked too:
    await this.db.friendship.updateMany({
      where: { userId: targetId, friendId: userId },
      data: { status: 'blocked' },
    });

    return rec;
  }

  // List friends
  async listFriends(userId: number) {
    // Find accepted friendships where user is either side
    const friendships = await this.db.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ userId }, { friendId: userId }],
      },
      include: {
        user: true,
        friend: true,
      },
    });

    // Map to "other user" + friendship meta
    return friendships.map((f) => {
      const other = f.userId === userId ? f.friend : f.user;
      return {
        friendshipId: f.id,
        otherUser: { id: other.id, name: other.name, email: other.email },
        createdAt: f.createdAt,
      };
    });
  }

  // List incoming/outgoing requests
  async listRequests(userId: number) {
    const incoming = await this.db.friendship.findMany({
      where: { friendId: userId, status: 'pending' },
      select: {
        id: true,
        createdAt: true,
        status: true,
        friend: { select: userSelect.public },
      },
    });
    const outgoing = await this.db.friendship.findMany({
      where: { userId, status: 'pending' },
      select: {
        id: true,
        createdAt: true,
        status: true,
        friend: { select: userSelect.public },
      },
    });
    return { incoming, outgoing };
  }
}
