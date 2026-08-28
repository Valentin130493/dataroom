import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller()
export class RootController {
  @Get()
  describe(): { service: string; docs: string; health: string } {
    return {
      service: 'Data Room API',
      docs: 'https://github.com/Valentin130493/dataroom#api-surface',
      health: '/health',
    };
  }
}
