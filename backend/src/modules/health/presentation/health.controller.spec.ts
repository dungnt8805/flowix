import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('should return service health', () => {
    const controller = new HealthController();

    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'flo-vis-backend'
    });
  });
});

