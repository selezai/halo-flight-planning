# Test Pilot Activity Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use systematic-debugging when issues arise, verification-before-completion before claiming success.

**Goal:** Capture anonymous test-pilot opens in Halo's own Neon database so launch activity can be inspected even while Vercel Web Analytics is disabled.

**Architecture:** The browser tracker sends the same two test-pilot events it already emits to Vercel, plus a fire-and-forget POST to a Next.js API route. The API validates input with Zod, adds request metadata server-side, and writes one append-only row through a repository helper.

**Tech Stack:** Next.js App Router, TypeScript, Zod, Drizzle ORM, Neon Postgres, Vitest.

---

### Task 1: Database Schema

**Files:**
- Create: `db/migrations/0002_test_pilot_events.sql`
- Modify: `lib/db/schema.ts`

- [x] **Step 1: Add the migration**

```sql
CREATE TABLE IF NOT EXISTS halo_test_pilot_events (
  id bigserial PRIMARY KEY,
  event_name text NOT NULL CHECK (event_name IN ('test_pilot_started', 'test_pilot_opened')),
  source text NOT NULL,
  pilot_code text,
  session_id text NOT NULL,
  referrer text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS halo_test_pilot_events_created_at_idx
  ON halo_test_pilot_events (created_at DESC);

CREATE INDEX IF NOT EXISTS halo_test_pilot_events_pilot_code_idx
  ON halo_test_pilot_events (pilot_code)
  WHERE pilot_code IS NOT NULL;
```

- [x] **Step 2: Add the Drizzle table**

```ts
export const haloTestPilotEvents = pgTable(
  'halo_test_pilot_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    eventName: text('event_name').notNull(),
    source: text('source').notNull(),
    pilotCode: text('pilot_code'),
    sessionId: text('session_id').notNull(),
    referrer: text('referrer'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index('halo_test_pilot_events_created_at_idx').on(table.createdAt),
    pilotCodeIdx: index('halo_test_pilot_events_pilot_code_idx').on(table.pilotCode),
  }),
);
```

### Task 2: Server-Side Event Write Path

**Files:**
- Create: `lib/testing/testPilotEvents.ts`
- Create: `app/api/testing/test-pilot-events/route.ts`
- Test: `tests/testing/testPilotEvents.test.ts`
- Test: `tests/testing/testPilotEventsApi.test.ts`

- [x] **Step 1: Implement validation and repository helper**

```ts
export const testPilotEventInputSchema = z.object({
  eventName: z.enum(['test_pilot_started', 'test_pilot_opened']),
  source: z.string().trim().min(1).max(80),
  pilotCode: z.string().trim().min(1).max(80).optional(),
  sessionId: z.string().trim().min(8).max(120),
});
```

- [x] **Step 2: Implement the API route**

```ts
export const POST = withApiLogging('/api/testing/test-pilot-events', async (request: NextRequest) => {
  const parsed = testPilotEventInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid test-pilot event payload.' }, { status: 400 });
  }

  await recordTestPilotEvent({
    ...parsed.data,
    referrer: request.headers.get('referer'),
    userAgent: request.headers.get('user-agent'),
  });

  return NextResponse.json({ ok: true });
});
```

### Task 3: Client Tracker

**Files:**
- Modify: `components/testing/TestPilotTracker.tsx`
- Test: `tests/testing/testPilotEventClient.test.ts`
- Test: `tests/testing/testPilotAccess.test.ts`

- [x] **Step 1: Send first-party events without blocking the planner**

```ts
void fetch('/api/testing/test-pilot-events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ eventName, ...eventProperties }),
  keepalive: true,
}).catch(() => undefined);
```

### Task 4: Verification And Production

**Files:**
- Modify: `PROJECT_SESSION_LOG.md`

- [x] **Step 1: Run focused tests**

```bash
pnpm test tests/testing/testPilotAccess.test.ts tests/testing/testPilotEvents.test.ts tests/testing/testPilotEventsApi.test.ts tests/testing/testPilotEventClient.test.ts
```

- [x] **Step 2: Run typecheck and build**

```bash
pnpm typecheck
pnpm build
```

- [x] **Step 3: Apply additive production migration**

```bash
node --input-type=module - <<'NODE'
const fs = require('fs');
const text = fs.readFileSync('.vercel/.env.production.local', 'utf8');
const values = {};
for (const line of text.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const separator = trimmed.indexOf('=');
  if (separator === -1) continue;
  const key = trimmed.slice(0, separator).trim();
  let value = trimmed.slice(separator + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  values[key] = value;
}
process.env.DATABASE_URL = values.DATABASE_URL || values.POSTGRES_URL;
await import('./scripts/migrate-account-sync.mjs');
NODE
```

- [x] **Step 4: Deploy to production and smoke test**

```bash
vercel --prod --yes
curl -I "https://halo-flight-planning.vercel.app/?testPilot=1&source=agent-smoke&pilot=agent"
```
