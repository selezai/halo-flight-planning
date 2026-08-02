import { z } from 'zod';

const MAX_TEXT_LENGTH = 500;
const MAX_PATH_LENGTH = 300;
const MAX_USER_AGENT_LENGTH = 500;

export const clientErrorPayloadSchema = z.object({
  source: z.enum(['app-error-boundary', 'global-error-boundary', 'client-recovery']),
  buildId: z.string().trim().max(120).optional(),
  errorName: z.string().trim().max(120).optional(),
  errorMessage: z.string().trim().min(1).max(2_000),
  digest: z.string().trim().max(200).optional(),
  path: z.string().trim().max(1_000).optional(),
  userAgent: z.string().trim().max(1_000).optional(),
  occurredAt: z.string().trim().max(80).optional(),
});

export type ClientErrorPayload = z.infer<typeof clientErrorPayloadSchema>;

export function parseClientErrorPayload(input: unknown):
  | { ok: true; payload: ClientErrorPayload }
  | { ok: false } {
  const parsed = clientErrorPayloadSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  return { ok: true, payload: parsed.data };
}

export function buildSafeClientErrorLog(payload: ClientErrorPayload) {
  return {
    level: 'error' as const,
    message: 'client_error_reported',
    source: payload.source,
    buildId: sanitizeClientLogText(payload.buildId, 120),
    errorName: sanitizeClientLogText(payload.errorName, 120),
    errorMessage: sanitizeClientLogText(payload.errorMessage, MAX_TEXT_LENGTH),
    digest: sanitizeClientLogText(payload.digest, 200),
    path: sanitizeClientPath(payload.path),
    userAgent: sanitizeClientLogText(payload.userAgent, MAX_USER_AGENT_LENGTH),
    occurredAt: sanitizeClientLogText(payload.occurredAt, 80),
    timestamp: new Date().toISOString(),
  };
}

export function sanitizeClientLogText(value: string | undefined, maxLength = MAX_TEXT_LENGTH): string | undefined {
  if (!value) return undefined;

  const redacted = value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/((?:api[_-]?key|token|secret|password|authorization)=)[^&\s]+/gi, '$1[redacted]');

  return redacted.length > maxLength
    ? `${redacted.slice(0, Math.max(0, maxLength - 1))}…`
    : redacted;
}

function sanitizeClientPath(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const withoutQuery = value.split('?')[0] || value;
  return sanitizeClientLogText(withoutQuery, MAX_PATH_LENGTH);
}
