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
} from '@nestjs/common';
import {
  ConfirmUploadInput,
  InitUploadInput,
  NodeSummary,
  StorageUsage,
  UploadTicket,
  confirmUploadSchema,
  initUploadSchema,
} from '@dataroom/shared';
import { AccessContext } from '../access/access.service';
import { Access } from '../common/decorators/access-context.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UploadsService } from './uploads.service';

@Controller()
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('data-rooms/:dataRoomId/uploads')
  init(
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Body(new ZodValidationPipe(initUploadSchema)) input: InitUploadInput,
    @Access() context: AccessContext,
  ): Promise<UploadTicket[]> {
    return this.uploads.init(dataRoomId, input, context);
  }

  @Get('storage/usage')
  usage(): Promise<StorageUsage> {
    return this.uploads.usage();
  }

  @Post('uploads/confirm')
  @HttpCode(HttpStatus.CREATED)
  confirm(
    @Body(new ZodValidationPipe(confirmUploadSchema)) input: ConfirmUploadInput,
    @Access() context: AccessContext,
  ): Promise<NodeSummary> {
    return this.uploads.confirm(input, context);
  }

  @Delete('uploads/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  abort(
    @Param('id', ParseUUIDPipe) id: string,
    @Access() context: AccessContext,
  ): Promise<void> {
    return this.uploads.abort(id, context);
  }
}
