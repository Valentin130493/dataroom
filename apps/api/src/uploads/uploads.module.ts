import { Module } from '@nestjs/common';
import { NodesModule } from '../nodes/nodes.module';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [NodesModule],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
