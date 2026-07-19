export async function withApiLogging(
  request: Request,
  route: string,
  handler: () => Promise<Response>
): Promise<Response> {
  const start = Date.now();
  const requestId = getRequestId(request);

  try {
    const response = await handler();
    logApiRequest({
      route,
      method: request.method,
      status: response.status,
      durationMs: Date.now() - start,
      requestId,
    });
    return response;
  } catch (error) {
    logApiRequest({
      route,
      method: request.method,
      status: 500,
      durationMs: Date.now() - start,
      requestId,
      error: error instanceof Error ? error.name : 'UnknownError',
    });
    throw error;
  }
}

export function logApiRequest(fields: {
  route: string;
  method: string;
  status: number;
  durationMs: number;
  requestId: string;
  error?: string;
}) {
  const payload = {
    type: 'api_request',
    route: fields.route,
    method: fields.method,
    status: fields.status,
    durationMs: fields.durationMs,
    requestId: fields.requestId,
    error: fields.error,
  };

  if (fields.status >= 500) {
    console.error(JSON.stringify(payload));
  } else {
    console.info(JSON.stringify(payload));
  }
}

function getRequestId(request: Request): string {
  return (
    request.headers.get('x-vercel-id') ??
    request.headers.get('x-request-id') ??
    crypto.randomUUID()
  );
}
