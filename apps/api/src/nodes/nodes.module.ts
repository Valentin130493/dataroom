import { Module } from '@nestjs/common';
import { DataRoomNodesController } from './data-room-nodes.controller';
import { NodeNamingService } from './node-naming.service';
import { NodeRollupService } from './node-rollup.service';
import { NodesController } from './nodes.controller';
import { NodesService } from './nodes.service';

@Module({
  controllers: [NodesController, DataRoomNodesController],
  providers: [NodesService, NodeNamingService, NodeRollupService],
  exports: [NodesService, NodeNamingService, NodeRollupService],
})
export class NodesModule {}
