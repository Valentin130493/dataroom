import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DomainException } from '../../common/errors/domain.exception';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly auth: AuthService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.auth.isGoogleEnabled) {
      throw DomainException.notConfigured('Google sign-in is not configured on this deployment');
    }

    return super.canActivate(context);
  }
}
