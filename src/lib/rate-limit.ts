import { NextRequest, NextResponse } from 'next/server';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function prune(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Fixed-window limiter kept in process memory so email routes can throttle
 * abuse without Redis or another service. Counts reset on restart and are
 * not shared across instances.
 */
export function rateLimit(
  request: NextRequest,
  options: {
    bucket: string;
    limit: number;
    windowMs: number;
    extraKey?: string;
    /** `ip` counts per client address. `global` counts only by extraKey. */
    scope?: 'ip' | 'global';
  }
): NextResponse | null {
  const now = Date.now();
  prune(now);

  const scope = options.scope ?? 'ip';
  const key =
    scope === 'global'
      ? `${options.bucket}:${options.extraKey ?? ''}`
      : `${options.bucket}:${clientIp(request)}:${options.extraKey ?? ''}`;

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (existing.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSeconds) },
      }
    );
  }

  existing.count += 1;
  return null;
}
