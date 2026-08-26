import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { hash, verify } from '@node-rs/argon2';
import { AuthConfig, ErrorCode, SignInInput, SignUpInput } from '@dataroom/shared';
import { DomainException } from '../common/errors/domain.exception';
import { Env } from '../config/env';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  getConfig(): AuthConfig {
    return { providers: { google: this.isGoogleEnabled } };
  }

  get isGoogleEnabled(): boolean {
    return Boolean(
      this.config.get('GOOGLE_CLIENT_ID', { infer: true }) &&
        this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }) &&
        this.config.get('GOOGLE_CALLBACK_URL', { infer: true }),
    );
  }

  async signUp(input: SignUpInput): Promise<User> {
    const existing = await this.users.findByEmail(input.email);

    if (existing) {
      throw DomainException.conflict(
        ErrorCode.EMAIL_ALREADY_REGISTERED,
        'An account with this email already exists',
      );
    }

    const user = await this.users.create({
      email: input.email,
      name: input.name ?? null,
      passwordHash: await hash(input.password),
    });

    await this.users.claimPendingShares(user);

    return user;
  }

  async signIn(input: SignInInput): Promise<User> {
    const user = await this.users.findByEmail(input.email);

    if (!user?.passwordHash || !(await verify(user.passwordHash, input.password))) {
      throw new DomainException(ErrorCode.INVALID_CREDENTIALS, 401, 'Invalid email or password');
    }

    return user;
  }

  async signInWithGoogle(profile: {
    providerAccountId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<User> {
    const user = await this.users.findOrCreateFromOAuth({ provider: 'google', ...profile });

    await this.users.claimPendingShares(user);

    return user;
  }
}
