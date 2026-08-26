import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import { Env } from '../config/env';
import { TokenPair, TokenService } from './token.service';

export const ACCESS_COOKIE = 'dr_access';
export const REFRESH_COOKIE = 'dr_refresh';

@Injectable()
export class CookieService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly tokens: TokenService,
  ) {}

  set(response: Response, pair: TokenPair): void {
    response.cookie(ACCESS_COOKIE, pair.accessToken, this.options(this.tokens.accessTtlMs));
    response.cookie(REFRESH_COOKIE, pair.refreshToken, this.options(this.tokens.refreshTtlMs));
  }

  clear(response: Response): void {
    const options = { ...this.options(0) };
    delete options.maxAge;

    response.clearCookie(ACCESS_COOKIE, options);
    response.clearCookie(REFRESH_COOKIE, options);
  }

  private options(maxAge: number): CookieOptions {
    const isProduction = this.config.get('NODE_ENV', { infer: true }) !== 'development';
    const domain = this.config.get('COOKIE_DOMAIN', { infer: true });

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge,
      ...(domain ? { domain } : {}),
    };
  }
}
