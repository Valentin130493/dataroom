import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Env } from '../../config/env';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService<Env, true>,
    private readonly auth: AuthService,
  ) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID', { infer: true }) as string,
      clientSecret: config.get('GOOGLE_CLIENT_SECRET', { infer: true }) as string,
      callbackURL: config.get('GOOGLE_CALLBACK_URL', { infer: true }) as string,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      done(new Error('Google account has no email'));
      return;
    }

    const user = await this.auth.signInWithGoogle({
      providerAccountId: profile.id,
      email: email.toLowerCase(),
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    });

    done(null, user);
  }
}
