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
import {
  DeletePreview,
  FileVersionSummary,
  MoveNodeInput,
  NodeDetails,
  NodeSummary,
  RenameNodeInput,
  SignedContentUrl,
  moveNodeSchema,
  renameNodeSchema,
} from '@dataroom/shared';
import { AccessContext } from '../access/access.service';
import { Access } from '../common/decorators/access-context.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { NodesService } from './nodes.service';

@Controller('nodes')
export class NodesController {
  constructor(private readonly nodes: NodesService) {}

  @Get(':id')
  details(
    @Param('id', ParseUUIDPipe) id: string,
    @Access() context: AccessContext,
  ): Promise<NodeDetails> {
    return this.nodes.details(id, context);
  }

  @Patch(':id')
  rename(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(renameNodeSchema)) input: RenameNodeInput,
    @Access() context: AccessContext,
  ): Promise<NodeSummary> {
    return this.nodes.rename(id, input, context);
  }

  @Post(':id/move')
  @HttpCode(HttpStatus.OK)
  move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(moveNodeSchema)) input: MoveNodeInput,
    @Access() context: AccessContext,
  ): Promise<NodeSummary> {
    return this.nodes.move(id, input, context);
  }

  @Get(':id/delete-preview')
  deletePreview(
    @Param('id', ParseUUIDPipe) id: string,
    @Access() context: AccessContext,
  ): Promise<DeletePreview> {
    return this.nodes.deletePreview(id, context);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Access() context: AccessContext,
  ): Promise<void> {
    return this.nodes.remove(id, context);
  }

  @Get(':id/content-url')
  contentUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Access() context: AccessContext,
  ): Promise<SignedContentUrl> {
    return this.nodes.contentUrl(id, context);
  }

  @Get(':id/versions')
  versions(
    @Param('id', ParseUUIDPipe) id: string,
    @Access() context: AccessContext,
  ): Promise<FileVersionSummary[]> {
    return this.nodes.versions(id, context);
  }
}
