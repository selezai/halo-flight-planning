'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock3, Copy, Loader2, Play, RadioTower, ShieldAlert, StopCircle } from 'lucide-react';

type DiagnosticStatus = 'idle' | 'running' | 'success' | 'error' | 'unsupported';
type DiagnosticKind = 'permission' | 'current' | 'watch';

interface GpsDiagnosticStrategy {
  id: string;
  label: string;
  description: string;
  kind: DiagnosticKind;
  options?: PositionOptions;
  manualTimeoutMs?: number;
}

interface GpsEnvironmentSnapshot {
  isSecureContext: boolean;
  protocol: string;
  host: string;
  userAgent: string;
  platform: string;
  language: string;
  permissionsApiAvailable: boolean;
  geolocationAvailable: boolean;
  sampledAt: string;
}

interface GpsEventRecord {
  at: string;
  elapsedMs: number;
  type: 'success' | 'error' | 'manual-timeout';
  code?: number;
  name?: string;
  message?: string;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
  altitudeM?: number | null;
  headingDeg?: number | null;
  speedMps?: number | null;
}

interface GpsDiagnosticResult {
  id: string;
  label: string;
  description: string;
  kind: DiagnosticKind;
  status: DiagnosticStatus;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  permissionState?: PermissionState | 'unavailable';
  options?: PositionOptions;
  code?: number;
  name?: string;
  message?: string;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
  altitudeM?: number | null;
  headingDeg?: number | null;
  speedMps?: number | null;
  environment?: GpsEnvironmentSnapshot;
  events: GpsEventRecord[];
}

const CURRENT_POSITION_STRATEGIES: GpsDiagnosticStrategy[] = [
  {
    id: 'current-fast-cached',
    label: 'Fast cached / low accuracy',
    description: 'Best first attempt for a moving pilot UI: accepts a recent cached fix and avoids forcing GPS immediately.',
    kind: 'current',
    options: {
      enableHighAccuracy: false,
      maximumAge: 600_000,
      timeout: 10_000,
    },
    manualTimeoutMs: 15_000,
  },
  {
    id: 'current-halo-live',
    label: 'Current Halo initial fix',
    description: 'Matches Halo’s current first GPS request so we can compare the production failure exactly.',
    kind: 'current',
    options: {
      enableHighAccuracy: false,
      maximumAge: 300_000,
      timeout: 15_000,
    },
    manualTimeoutMs: 20_000,
  },
  {
    id: 'current-browser-default',
    label: 'Browser default current position',
    description: 'Calls getCurrentPosition without options. A manual lab timeout prevents the test from hanging forever.',
    kind: 'current',
    manualTimeoutMs: 30_000,
  },
  {
    id: 'current-fresh-high',
    label: 'Fresh high accuracy',
    description: 'Forces a fresh high-accuracy fix. This can be slower indoors but proves whether GPS can eventually resolve.',
    kind: 'current',
    options: {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 45_000,
    },
    manualTimeoutMs: 50_000,
  },
];

const WATCH_POSITION_STRATEGIES: GpsDiagnosticStrategy[] = [
  {
    id: 'watch-low-first',
    label: 'Watch low accuracy first update',
    description: 'Open-source map controls often keep a watch alive instead of failing permanently after one unavailable event.',
    kind: 'watch',
    options: {
      enableHighAccuracy: false,
      maximumAge: 300_000,
      timeout: 20_000,
    },
    manualTimeoutMs: 45_000,
  },
  {
    id: 'watch-high-refine',
    label: 'Watch high accuracy refinement',
    description: 'Keeps listening for a better fix after the browser starts its location provider.',
    kind: 'watch',
    options: {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30_000,
    },
    manualTimeoutMs: 60_000,
  },
];

const PERMISSION_STRATEGY: GpsDiagnosticStrategy = {
  id: 'permission-query',
  label: 'Browser permission state',
  description: 'Reads Permissions API state where supported. Safari can be inaccurate here, so raw GPS tests still matter.',
  kind: 'permission',
};

const ALL_STRATEGIES = [
  PERMISSION_STRATEGY,
  ...CURRENT_POSITION_STRATEGIES,
  ...WATCH_POSITION_STRATEGIES,
];

function getEnvironmentSnapshot(): GpsEnvironmentSnapshot {
  return {
    isSecureContext: window.isSecureContext,
    protocol: window.location.protocol,
    host: window.location.host,
    userAgent: window.navigator.userAgent,
    platform: window.navigator.platform,
    language: window.navigator.language,
    permissionsApiAvailable: Boolean(window.navigator.permissions?.query),
    geolocationAvailable: Boolean(window.navigator.geolocation),
    sampledAt: new Date().toISOString(),
  };
}

function createInitialResult(strategy: GpsDiagnosticStrategy, environment?: GpsEnvironmentSnapshot): GpsDiagnosticResult {
  return {
    id: strategy.id,
    label: strategy.label,
    description: strategy.description,
    kind: strategy.kind,
    status: 'idle',
    options: strategy.options,
    environment,
    events: [],
  };
}

function getErrorName(code: number | undefined): string | undefined {
  if (code === 1) return 'PERMISSION_DENIED';
  if (code === 2) return 'POSITION_UNAVAILABLE';
  if (code === 3) return 'TIMEOUT';
  return undefined;
}

function positionToEvent(position: GeolocationPosition, startedAtMs: number): GpsEventRecord {
  return {
    at: new Date().toISOString(),
    elapsedMs: Math.round(performance.now() - startedAtMs),
    type: 'success',
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyM: position.coords.accuracy,
    altitudeM: position.coords.altitude,
    headingDeg: position.coords.heading,
    speedMps: position.coords.speed,
  };
}

function errorToEvent(error: GeolocationPositionError, startedAtMs: number): GpsEventRecord {
  return {
    at: new Date().toISOString(),
    elapsedMs: Math.round(performance.now() - startedAtMs),
    type: 'error',
    code: error.code,
    name: getErrorName(error.code),
    message: error.message || 'Browser returned a geolocation error without a message.',
  };
}

function manualTimeoutEvent(startedAtMs: number, timeoutMs: number): GpsEventRecord {
  return {
    at: new Date().toISOString(),
    elapsedMs: Math.round(performance.now() - startedAtMs),
    type: 'manual-timeout',
    code: 3,
    name: 'LAB_MANUAL_TIMEOUT',
    message: `Halo GPS Lab stopped waiting after ${Math.round(timeoutMs / 1000)} seconds without a successful fix.`,
  };
}

function completeResult(
  result: GpsDiagnosticResult,
  status: DiagnosticStatus,
  event: GpsEventRecord,
  startedAtMs: number
): GpsDiagnosticResult {
  const endedAt = new Date().toISOString();
  const durationMs = Math.round(performance.now() - startedAtMs);

  return {
    ...result,
    status,
    endedAt,
    durationMs,
    code: event.code,
    name: event.name,
    message: event.message,
    latitude: event.latitude,
    longitude: event.longitude,
    accuracyM: event.accuracyM,
    altitudeM: event.altitudeM,
    headingDeg: event.headingDeg,
    speedMps: event.speedMps,
    events: [...result.events, event],
  };
}

function appendEvent(result: GpsDiagnosticResult, event: GpsEventRecord): GpsDiagnosticResult {
  return {
    ...result,
    events: [...result.events, event],
    code: event.code ?? result.code,
    name: event.name ?? result.name,
    message: event.message ?? result.message,
  };
}

function formatOptions(options: PositionOptions | undefined): string {
  if (!options) return 'Browser defaults';

  return [
    `highAccuracy=${String(options.enableHighAccuracy ?? false)}`,
    `maximumAge=${typeof options.maximumAge === 'number' ? `${Math.round(options.maximumAge / 1000)}s` : 'default'}`,
    `timeout=${typeof options.timeout === 'number' ? `${Math.round(options.timeout / 1000)}s` : 'default'}`,
  ].join(' · ');
}

function formatCoordinates(result: GpsDiagnosticResult): string {
  if (typeof result.latitude !== 'number' || typeof result.longitude !== 'number') return '—';

  return `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`;
}

function formatAccuracy(result: GpsDiagnosticResult): string {
  return typeof result.accuracyM === 'number' ? `${Math.round(result.accuracyM)} m` : '—';
}

function statusTone(status: DiagnosticStatus): string {
  if (status === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (status === 'error') return 'border-rose-200 bg-rose-50 text-rose-900';
  if (status === 'unsupported') return 'border-amber-200 bg-amber-50 text-amber-950';
  if (status === 'running') return 'border-cyan-200 bg-cyan-50 text-cyan-950';
  return 'border-slate-200 bg-white text-slate-700';
}

function statusIcon(status: DiagnosticStatus) {
  if (status === 'success') return <CheckCircle2 className="h-4 w-4" />;
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin" />;
  if (status === 'error') return <ShieldAlert className="h-4 w-4" />;
  if (status === 'unsupported') return <AlertTriangle className="h-4 w-4" />;
  return <Clock3 className="h-4 w-4" />;
}

export default function GpsLabClient() {
  const [environment, setEnvironment] = useState<GpsEnvironmentSnapshot | null>(null);
  const [results, setResults] = useState<GpsDiagnosticResult[]>([]);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const watches = useRef<Map<string, number>>(new Map());
  const timers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const activeWatches = watches.current;
    const activeTimers = timers.current;
    const snapshot = getEnvironmentSnapshot();
    setEnvironment(snapshot);
    setResults(ALL_STRATEGIES.map((strategy) => createInitialResult(strategy, snapshot)));

    return () => {
      activeWatches.forEach((watchId) => window.navigator.geolocation?.clearWatch(watchId));
      activeTimers.forEach((timerId) => window.clearTimeout(timerId));
      activeWatches.clear();
      activeTimers.clear();
    };
  }, []);

  const exportPayload = useMemo(() => ({
    generatedAt: new Date().toISOString(),
    environment,
    results,
  }), [environment, results]);

  const updateResult = (id: string, updater: (result: GpsDiagnosticResult) => GpsDiagnosticResult) => {
    setResults((current) => current.map((result) => (result.id === id ? updater(result) : result)));
  };

  const markRunning = (strategy: GpsDiagnosticStrategy, startedAt: string) => {
    setRunningIds((current) => new Set(current).add(strategy.id));
    updateResult(strategy.id, (result) => ({
      ...createInitialResult(strategy, environment ?? undefined),
      status: 'running',
      startedAt,
    }));
  };

  const markDone = (id: string) => {
    setRunningIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const stopStrategy = (strategyId: string) => {
    const watchId = watches.current.get(strategyId);
    if (typeof watchId === 'number') {
      window.navigator.geolocation?.clearWatch(watchId);
      watches.current.delete(strategyId);
    }

    const timerId = timers.current.get(strategyId);
    if (typeof timerId === 'number') {
      window.clearTimeout(timerId);
      timers.current.delete(strategyId);
    }

    markDone(strategyId);
  };

  const runPermissionStrategy = async (strategy: GpsDiagnosticStrategy) => {
    const startedAtMs = performance.now();
    const startedAt = new Date().toISOString();
    markRunning(strategy, startedAt);

    if (!window.navigator.permissions?.query) {
      updateResult(strategy.id, (result) => ({
        ...result,
        status: 'unsupported',
        endedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - startedAtMs),
        permissionState: 'unavailable',
        message: 'This browser does not expose navigator.permissions.query. Run the raw GPS strategies anyway.',
      }));
      markDone(strategy.id);
      return;
    }

    try {
      const permission = await window.navigator.permissions.query({ name: 'geolocation' as PermissionName });
      updateResult(strategy.id, (result) => ({
        ...result,
        status: 'success',
        endedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - startedAtMs),
        permissionState: permission.state,
        message: `Permissions API state: ${permission.state}`,
      }));
    } catch (error) {
      updateResult(strategy.id, (result) => ({
        ...result,
        status: 'error',
        endedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - startedAtMs),
        message: error instanceof Error ? error.message : 'Permission query failed.',
      }));
    } finally {
      markDone(strategy.id);
    }
  };

  const runCurrentPositionStrategy = (strategy: GpsDiagnosticStrategy) => new Promise<void>((resolve) => {
    const startedAtMs = performance.now();
    const startedAt = new Date().toISOString();
    markRunning(strategy, startedAt);

    if (!window.navigator.geolocation) {
      updateResult(strategy.id, (result) => ({
        ...result,
        status: 'unsupported',
        endedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - startedAtMs),
        message: 'navigator.geolocation is not available in this browser/context.',
      }));
      markDone(strategy.id);
      resolve();
      return;
    }

    let settled = false;
    const finish = (status: DiagnosticStatus, event: GpsEventRecord) => {
      if (settled) return;
      settled = true;
      stopStrategy(strategy.id);
      updateResult(strategy.id, (result) => completeResult(result, status, event, startedAtMs));
      resolve();
    };

    const manualTimeoutMs = strategy.manualTimeoutMs ?? 30_000;
    const timerId = window.setTimeout(() => {
      finish('error', manualTimeoutEvent(startedAtMs, manualTimeoutMs));
    }, manualTimeoutMs);
    timers.current.set(strategy.id, timerId);

    try {
      const onSuccess = (position: GeolocationPosition) => finish('success', positionToEvent(position, startedAtMs));
      const onError = (error: GeolocationPositionError) => finish('error', errorToEvent(error, startedAtMs));

      if (strategy.options) {
        window.navigator.geolocation.getCurrentPosition(onSuccess, onError, strategy.options);
      } else {
        window.navigator.geolocation.getCurrentPosition(onSuccess, onError);
      }
    } catch (error) {
      finish('error', {
        at: new Date().toISOString(),
        elapsedMs: Math.round(performance.now() - startedAtMs),
        type: 'error',
        message: error instanceof Error ? error.message : 'getCurrentPosition threw before the browser request started.',
      });
    }
  });

  const runWatchPositionStrategy = (strategy: GpsDiagnosticStrategy) => new Promise<void>((resolve) => {
    const startedAtMs = performance.now();
    const startedAt = new Date().toISOString();
    markRunning(strategy, startedAt);

    if (!window.navigator.geolocation) {
      updateResult(strategy.id, (result) => ({
        ...result,
        status: 'unsupported',
        endedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - startedAtMs),
        message: 'navigator.geolocation is not available in this browser/context.',
      }));
      markDone(strategy.id);
      resolve();
      return;
    }

    let settled = false;
    const finish = (status: DiagnosticStatus, event: GpsEventRecord) => {
      if (settled) return;
      settled = true;
      stopStrategy(strategy.id);
      updateResult(strategy.id, (result) => completeResult(result, status, event, startedAtMs));
      resolve();
    };

    const manualTimeoutMs = strategy.manualTimeoutMs ?? 45_000;
    const timerId = window.setTimeout(() => {
      finish('error', manualTimeoutEvent(startedAtMs, manualTimeoutMs));
    }, manualTimeoutMs);
    timers.current.set(strategy.id, timerId);

    try {
      const watchId = window.navigator.geolocation.watchPosition(
        (position) => finish('success', positionToEvent(position, startedAtMs)),
        (error) => {
          const event = errorToEvent(error, startedAtMs);

          updateResult(strategy.id, (result) => appendEvent(result, event));

          if (error.code === error.PERMISSION_DENIED) {
            finish('error', event);
          }
        },
        strategy.options
      );
      watches.current.set(strategy.id, watchId);
    } catch (error) {
      finish('error', {
        at: new Date().toISOString(),
        elapsedMs: Math.round(performance.now() - startedAtMs),
        type: 'error',
        message: error instanceof Error ? error.message : 'watchPosition threw before the browser request started.',
      });
    }
  });

  const runStrategy = async (strategy: GpsDiagnosticStrategy) => {
    setCopyState('idle');

    if (strategy.kind === 'permission') {
      await runPermissionStrategy(strategy);
      return;
    }

    if (strategy.kind === 'current') {
      await runCurrentPositionStrategy(strategy);
      return;
    }

    await runWatchPositionStrategy(strategy);
  };

  const runAll = async () => {
    for (const strategy of ALL_STRATEGIES) {
      await runStrategy(strategy);
    }
  };

  const stopAll = () => {
    Array.from(runningIds).forEach(stopStrategy);
  };

  const copyResults = async () => {
    try {
      await window.navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  const anyRunning = runningIds.size > 0;

  return (
    <main className="min-h-dvh bg-[#fff9ec] px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Halo GPS Lab</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
                Browser location diagnostics
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                This page tests raw browser geolocation without the map, route planner, waypoint editor, or Halo state.
                It is for controlled debugging before changing the production aircraft tracker.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={runAll}
                disabled={anyRunning}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {anyRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run all GPS tests
              </button>
              <button
                type="button"
                onClick={stopAll}
                disabled={!anyRunning}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <StopCircle className="h-4 w-4" />
                Stop watches
              </button>
              <button
                type="button"
                onClick={copyResults}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 text-sm font-semibold text-cyan-950 shadow-sm transition hover:bg-cyan-100"
              >
                <Copy className="h-4 w-4" />
                {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy results'}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-4 shadow-[0_18px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-5">
            <div className="flex items-center gap-2">
              <RadioTower className="h-5 w-5 text-cyan-700" />
              <h2 className="text-lg font-semibold tracking-[-0.03em]">Test strategies</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {results.map((result) => {
                const strategy = ALL_STRATEGIES.find((entry) => entry.id === result.id) ?? PERMISSION_STRATEGY;
                const running = runningIds.has(result.id);

                return (
                  <article
                    key={result.id}
                    className={`rounded-2xl border p-4 ${statusTone(result.status)}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {statusIcon(result.status)}
                          <h3 className="font-semibold text-slate-950">{result.label}</h3>
                          <span className="rounded-full border border-current/15 bg-white/70 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em]">
                            {result.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-600">{result.description}</p>
                        <p className="mt-2 font-mono text-[0.7rem] text-slate-500">{formatOptions(result.options)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => (running ? stopStrategy(result.id) : runStrategy(strategy))}
                        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/70 bg-white/90 px-3 text-xs font-semibold text-slate-850 shadow-sm transition hover:bg-white"
                      >
                        {running ? <StopCircle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {running ? 'Stop' : 'Run'}
                      </button>
                    </div>

                    <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-4">
                      <div className="rounded-xl bg-white/70 p-3">
                        <dt className="font-semibold uppercase tracking-[0.14em] text-slate-500">Result</dt>
                        <dd className="mt-1 font-semibold text-slate-950">{result.name ?? result.permissionState ?? '—'}</dd>
                      </div>
                      <div className="rounded-xl bg-white/70 p-3">
                        <dt className="font-semibold uppercase tracking-[0.14em] text-slate-500">Duration</dt>
                        <dd className="mt-1 font-semibold text-slate-950">
                          {typeof result.durationMs === 'number' ? `${result.durationMs} ms` : '—'}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-white/70 p-3">
                        <dt className="font-semibold uppercase tracking-[0.14em] text-slate-500">Coordinates</dt>
                        <dd className="mt-1 break-words font-semibold text-slate-950">{formatCoordinates(result)}</dd>
                      </div>
                      <div className="rounded-xl bg-white/70 p-3">
                        <dt className="font-semibold uppercase tracking-[0.14em] text-slate-500">Accuracy</dt>
                        <dd className="mt-1 font-semibold text-slate-950">{formatAccuracy(result)}</dd>
                      </div>
                    </dl>

                    {result.message && (
                      <p className="mt-3 rounded-xl bg-white/70 p-3 text-xs leading-5 text-slate-700">{result.message}</p>
                    )}

                    {result.events.length > 0 && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-white/70 bg-white/70">
                        <div className="border-b border-slate-200/70 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Event log
                        </div>
                        <div className="max-h-36 overflow-y-auto p-3">
                          <ul className="space-y-2">
                            {result.events.map((event, index) => (
                              <li key={`${result.id}-${event.at}-${index}`} className="font-mono text-[0.7rem] leading-5 text-slate-650">
                                +{event.elapsedMs}ms · {event.type}
                                {event.name ? ` · ${event.name}` : ''}
                                {event.message ? ` · ${event.message}` : ''}
                                {typeof event.latitude === 'number' && typeof event.longitude === 'number'
                                  ? ` · ${event.latitude.toFixed(6)}, ${event.longitude.toFixed(6)}`
                                  : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="rounded-[1.75rem] border border-white/70 bg-white/90 p-4 shadow-[0_18px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-5">
              <h2 className="text-lg font-semibold tracking-[-0.03em]">Environment</h2>
              <dl className="mt-4 grid gap-2 text-xs">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <dt className="font-semibold uppercase tracking-[0.14em] text-slate-500">Secure context</dt>
                  <dd className="mt-1 font-semibold text-slate-950">{environment?.isSecureContext ? 'Yes' : 'No'}</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <dt className="font-semibold uppercase tracking-[0.14em] text-slate-500">Origin</dt>
                  <dd className="mt-1 break-words font-semibold text-slate-950">
                    {environment ? `${environment.protocol}//${environment.host}` : '—'}
                  </dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <dt className="font-semibold uppercase tracking-[0.14em] text-slate-500">Browser APIs</dt>
                  <dd className="mt-1 font-semibold text-slate-950">
                    GPS {environment?.geolocationAvailable ? 'available' : 'missing'} · Permissions {environment?.permissionsApiAvailable ? 'available' : 'missing'}
                  </dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <dt className="font-semibold uppercase tracking-[0.14em] text-slate-500">User agent</dt>
                  <dd className="mt-1 break-words font-mono text-[0.7rem] leading-5 text-slate-700">{environment?.userAgent ?? '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 shadow-[0_18px_70px_rgba(15,23,42,0.10)] sm:p-5">
              <h2 className="font-semibold tracking-[-0.02em]">How to interpret the result</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-6">
                <li>If any strategy returns coordinates, Halo can adopt that strategy for aircraft tracking.</li>
                <li>If current-position tests fail but watch tests succeed, the tracker should start watch mode earlier and treat unavailable events as recoverable while waiting.</li>
                <li>If every raw strategy returns code 2, the browser/OS location provider is not delivering coordinates to websites on that device.</li>
                <li>If this page is not a secure context, geolocation is expected to fail. Use localhost on Mac, HTTPS in production, or a temporary HTTPS tunnel for iPhone testing.</li>
              </ul>
            </section>

            <section className="rounded-[1.75rem] border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950 shadow-[0_18px_70px_rgba(15,23,42,0.10)] sm:p-5">
              <h2 className="font-semibold tracking-[-0.02em]">References checked</h2>
              <ul className="mt-3 space-y-2 leading-6">
                <li><a className="underline" href="https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError/code" target="_blank" rel="noreferrer">MDN Geolocation error codes</a></li>
                <li><a className="underline" href="https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition" target="_blank" rel="noreferrer">MDN getCurrentPosition options</a></li>
                <li><a className="underline" href="https://maplibre.org/maplibre-gl-js/docs/API/classes/GeolocateControl/" target="_blank" rel="noreferrer">MapLibre GeolocateControl</a></li>
                <li><a className="underline" href="https://leafletjs.com/reference.html#map-locate" target="_blank" rel="noreferrer">Leaflet locate pattern</a></li>
                <li><a className="underline" href="https://openlayers.org/en/latest/examples/geolocation.html" target="_blank" rel="noreferrer">OpenLayers Geolocation</a></li>
              </ul>
            </section>

            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Back to Halo planner
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}
