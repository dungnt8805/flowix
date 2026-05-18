import { HttpException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { BaselineRateLimitGuard } from './baseline-rate-limit.guard';

describe('BaselineRateLimitGuard', () => {
  function contextFor(userId: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
          method: 'POST',
          route: { path: '/api/v1/diagrams/:diagramId/share-links' },
          user: { id: userId }
        })
      })
    } as unknown as ExecutionContext;
  }

  it('rejects sensitive requests after the baseline limit', () => {
    const guard = new BaselineRateLimitGuard();
    const context = contextFor(`user-${Date.now()}`);

    for (let index = 0; index < 30; index += 1) {
      expect(guard.canActivate(context)).toBe(true);
    }

    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });
});
