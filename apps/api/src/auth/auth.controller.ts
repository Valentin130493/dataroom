import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { User } from '@prisma/client';
import {
  AuthConfig,
  AuthUser,
  SignInInput,
  SignUpInput,
  signInSchema,
  signUpSchema,
} from '@dataroom/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Env } from '../config/env';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { CookieService, REFRESH_COOKIE } from './cookie.service';
import { TokenService } from './token.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly tokens: TokenService,
    private readonly cookies: CookieService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Get('config')
  getConfig(): AuthConfig {
    return this.auth.getConfig();
  }

  @Public()
  @Post('signup')
  async signUp(
    @Body(new ZodValidationPipe(signUpSchema)) input: SignUpInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUser> {
    const user = await this.auth.signUp(input);

    return this.startSession(user, response);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body(new ZodValidationPipe(signInSchema)) input: SignInInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUser> {
    const user = await this.auth.signIn(input);

    return this.startSession(user, response);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUser> {
    const cookies = request.cookies as Record<string, string> | undefined;
    const rotated = await this.tokens.rotate(cookies?.[REFRESH_COOKIE]);

    this.cookies.set(response, rotated);

    const user = await this.users.findById(rotated.userId);

    return this.users.toAuthUser(user as User);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const cookies = request.cookies as Record<string, string> | undefined;

    await this.tokens.revoke(cookies?.[REFRESH_COOKIE]);
    this.cookies.clear(response);
  }

  @Get('me')
  me(@CurrentUser() user: User): AuthUser {
    return this.users.toAuthUser(user);
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleStart(): void {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.startSession(user, response);

    response.redirect(`${this.config.get('WEB_APP_URL', { infer: true })}/rooms`);
  }

  private async startSession(user: User, response: Response): Promise<AuthUser> {
    const pair = await this.tokens.issue(user);

    this.cookies.set(response, pair);

    return this.users.toAuthUser(user);
  }
}
