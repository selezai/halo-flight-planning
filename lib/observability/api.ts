import { NextResponse } from 'next/server';

type LoggedHandler<TContext, TRequest extends Request = Request> = (
  request: TRequest,
  context: TContext
) => Promise<Response>;

export function getVercelRequestId(request: Request): string | null {
  return request.headers.get('x-vercel-id');
}

export function logApiEvent(
  event: {
    level: 'info' | 'warn' | 'error';
    message: string;
    route: string;
    method?: string;
    status?: number;
    durationMs?: number;
    requestId?: string | null;
    error?: string;
  }
) {
  const payload = JSON.stringify({
    level: event.level,
    message: event.message,
    route: event.route,
    method: event.method,
    status: event.status,
    durationMs: event.durationMs,
    requestId: event.requestId,
    error: event.error,
    timestamp: new Date().toISOString(),
  });

  if (event.level === 'error') {
    console.error(payload);
    return;
  }

  if (event.level === 'warn') {
    console.warn(payload);
    return;
  }

  console.log(payload);
}

export function withApiLogging<TContext, TRequest extends Request = Request>(
  route: string,
  handler: LoggedHandler<TContext, TRequest>
): LoggedHandler<TContext, TRequest> {
  return async (request, context) => {
    const startedAt = Date.now();
    const requestId = getVercelRequestId(request);

    logApiEvent({
      level: 'info',
      message: 'api_request_start',
      route,
      method: request.method,
      requestId,
    });

    try {
      const response = await handler(request, context);
      logApiEvent({
        level: response.status >= 500 ? 'error' : response.status >= 400 ? 'warn' : 'info',
        message: 'api_request_complete',
        route,
        method: request.method,
        status: response.status,
        durationMs: Date.now() - startedAt,
        requestId,
      });
      return response;
    } catch (caught) {
      logApiEvent({
        level: 'error',
        message: 'api_request_failed',
        route,
        method: request.method,
        status: 500,
        durationMs: Date.now() - startedAt,
        requestId,
        error: caught instanceof Error ? caught.name : 'UnknownError',
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
