import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { User } from '@prisma/client';
import { AccessContext } from '../../access/access.service';

export const Access = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request & { user?: User }>();
  const token = request.header('x-share-token') ?? undefined;

  const accessContext: AccessContext = {
    userId: request.user?.id,
    userEmail: request.user?.email,
    shareToken: token,
  };

  return accessContext;
});
