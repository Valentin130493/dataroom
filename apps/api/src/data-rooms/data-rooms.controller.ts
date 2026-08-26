import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { User } from '@prisma/client';
import {
  CreateDataRoomInput,
  DataRoomSummary,
  RenameDataRoomInput,
  createDataRoomSchema,
  renameDataRoomSchema,
} from '@dataroom/shared';
import { AccessContext } from '../access/access.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Access } from '../common/decorators/access-context.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { DataRoomsService } from './data-rooms.service';

@Controller('data-rooms')
export class DataRoomsController {
  constructor(private readonly dataRooms: DataRoomsService) {}

  @Get()
  list(@CurrentUser() user: User): Promise<DataRoomSummary[]> {
    return this.dataRooms.listOwned(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createDataRoomSchema)) input: CreateDataRoomInput,
  ): Promise<DataRoomSummary> {
    return this.dataRooms.create(user.id, input);
  }

  @Get(':id')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @Access() context: AccessContext,
  ): Promise<DataRoomSummary> {
    return this.dataRooms.get(id, context);
  }

  @Patch(':id')
  rename(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(renameDataRoomSchema)) input: RenameDataRoomInput,
    @Access() context: AccessContext,
  ): Promise<DataRoomSummary> {
    return this.dataRooms.rename(id, input, context);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Access() context: AccessContext,
  ): Promise<void> {
    return this.dataRooms.remove(id, context);
  }
}
