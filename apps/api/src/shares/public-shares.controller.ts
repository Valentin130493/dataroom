import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ListNodesQuery,
  NodeDetails,
  NodeSummary,
  Page,
  PublicShareContext,
  SignedContentUrl,
  listNodesSchema,
} from '@dataroom/shared';
import { AccessContext } from '../access/access.service';
import { Public } from '../auth/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { NodesService } from '../nodes/nodes.service';
import { SharesService } from './shares.service';

@Public()
@Controller('public/shares/:token')
export class PublicSharesController {
  constructor(
    private readonly shares: SharesService,
    private readonly nodes: NodesService,
  ) {}

  @Get()
  context(@Param('token') token: string): Promise<PublicShareContext> {
    return this.shares.publicContext(token);
  }

  @Get('nodes')
  async list(
    @Param('token') token: string,
    @Query(new ZodValidationPipe(listNodesSchema)) query: ListNodesQuery,
  ): Promise<Page<NodeSummary>> {
    const context = await this.shares.publicContext(token);

    return this.nodes.list(context.dataRoomId, query, this.toAccess(token));
  }

  @Get('nodes/:id')
  details(
    @Param('token') token: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NodeDetails> {
    return this.nodes.details(id, this.toAccess(token));
  }

  @Get('nodes/:id/content-url')
  contentUrl(
    @Param('token') token: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SignedContentUrl> {
    return this.nodes.contentUrl(id, this.toAccess(token));
  }

  private toAccess(token: string): AccessContext {
    return { shareToken: token };
  }
}
