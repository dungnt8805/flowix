import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/auth/public.decorator';

interface HealthResponse {
  status: 'ok';
  service: 'flo-vis-backend';
}

@ApiTags('Health')
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
