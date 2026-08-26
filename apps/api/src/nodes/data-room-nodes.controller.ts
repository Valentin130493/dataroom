import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  CreateFolderInput,
  ListNodesQuery,
  NodeSummary,
  Page,
  SearchNodesQuery,
  createFolderSchema,
  listNodesSchema,
  searchNodesSchema,
} from '@dataroom/shared';
import { AccessContext } from '../access/access.service';
import { Access } from '../common/decorators/access-context.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { NodesService } from './nodes.service';

@Controller('data-rooms/:dataRoomId')
export class DataRoomNodesController {
  constructor(private readonly nodes: NodesService) {}

  @Get('nodes')
  list(
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Query(new ZodValidationPipe(listNodesSchema)) query: ListNodesQuery,
    @Access() context: AccessContext,
  ): Promise<Page<NodeSummary>> {
    return this.nodes.list(dataRoomId, query, context);
  }

  @Get('search')
  search(
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Query(new ZodValidationPipe(searchNodesSchema)) query: SearchNodesQuery,
    @Access() context: AccessContext,
  ): Promise<Page<NodeSummary>> {
    return this.nodes.search(dataRoomId, query, context);
  }

  @Post('folders')
  createFolder(
    @Param('dataRoomId', ParseUUIDPipe) dataRoomId: string,
    @Body(new ZodValidationPipe(createFolderSchema)) input: CreateFolderInput,
    @Access() context: AccessContext,
  ): Promise<NodeSummary> {
    return this.nodes.createFolder(dataRoomId, input, context);
  }
}
