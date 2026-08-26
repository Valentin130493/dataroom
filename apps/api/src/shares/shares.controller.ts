import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { User } from '@prisma/client';
import {
  AddRecipientsInput,
  CreateShareInput,
  ShareSummary,
  SharedWithMeItem,
  addRecipientsSchema,
  createShareSchema,
} from '@dataroom/shared';
import { AccessContext } from '../access/access.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Access } from '../common/decorators/access-context.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SharesService } from './shares.service';

@Controller()
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  @Post('shares')
  create(
    @Body(new ZodValidationPipe(createShareSchema)) input: CreateShareInput,
    @Access() context: AccessContext,
  ): Promise<ShareSummary> {
    return this.shares.create(input, context);
  }

  @Get('shares')
  list(
    @Query('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Query('nodeId') nodeId: string | undefined,
    @Access() context: AccessContext,
  ): Promise<ShareSummary[]> {
    return this.shares.listForTarget(dataRoomId, nodeId ?? null, context);
  }

  @Delete('shares/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Access() context: AccessContext,
  ): Promise<void> {
    return this.shares.revoke(id, context);
  }

  @Post('shares/:id/recipients')
  addRecipients(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(addRecipientsSchema)) input: AddRecipientsInput,
    @Access() context: AccessContext,
  ): Promise<ShareSummary> {
    return this.shares.addRecipients(id, input, context);
  }

  @Delete('shares/:id/recipients/:recipientId')
  removeRecipient(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
    @Access() context: AccessContext,
  ): Promise<ShareSummary> {
    return this.shares.removeRecipient(id, recipientId, context);
  }

  @Get('shared-with-me')
  sharedWithMe(@CurrentUser() user: User): Promise<SharedWithMeItem[]> {
    return this.shares.sharedWithMe(user.id, user.email);
  }
}
