import { Controller, Get } from '@nestjs/common';
import { Public } from '../../../common/auth/public.decorator';

interface HealthResponse {
  status: 'ok';
  service: 'flo-vis-backend';
}

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'flo-vis-backend'
    };
  }
}
