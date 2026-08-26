import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { AuthUser } from '@dataroom/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findOrCreateFromOAuth(params: {
    provider: string;
    providerAccountId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<User> {
    const existingAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: params.provider,
          providerAccountId: params.providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingAccount) {
      return existingAccount.user;
    }

    return this.prisma.user.upsert({
      where: { email: params.email },
      update: {
        name: params.name,
        avatarUrl: params.avatarUrl,
        oauthAccounts: {
          create: { provider: params.provider, providerAccountId: params.providerAccountId },
        },
      },
      create: {
        email: params.email,
        name: params.name,
        avatarUrl: params.avatarUrl,
        oauthAccounts: {
          create: { provider: params.provider, providerAccountId: params.providerAccountId },
        },
      },
    });
  }

  async claimPendingShares(user: User): Promise<void> {
    await this.prisma.shareRecipient.updateMany({
      where: { email: user.email, userId: null },
      data: { userId: user.id, acceptedAt: new Date() },
    });
  }

  toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
