import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface RequestWithHeadersAndUser {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  method?: string;
  route?: { path?: string };
  url?: string;
  user?: { id: string };
}

interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 120;
const SENSITIVE_LIMIT = 30;
const buckets = new Map<string, Bucket>();

@Injectable()
export class BaselineRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithHeadersAndUser>();
    const limit = isSensitiveRequest(request) ? SENSITIVE_LIMIT : DEFAULT_LIMIT;
    const now = Date.now();
    const key = `${request.user?.id ?? request.ip ?? readHeader(request, 'x-forwarded-for') ?? 'anonymous'}:${request.method ?? 'GET'}:${request.route?.path ?? request.url ?? '/'}`;
    const bucket = buckets.get(key);

    if (bucket === undefined || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      throw new HttpException('Too many requests. Please retry shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}

function isSensitiveRequest(request: RequestWithHeadersAndUser): boolean {
  const path = `${request.route?.path ?? request.url ?? ''}`;
  return request.method !== 'GET' || path.includes('share-links') || path.includes('export');
}

function readHeader(request: RequestWithHeadersAndUser, headerName: string): string | undefined {
  const value = request.headers[headerName];
  return typeof value === 'string' ? value : value?.[0];
}
