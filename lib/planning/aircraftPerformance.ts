import { z } from 'zod';
import type {
  AircraftPerformanceProfile,
  AircraftPerformanceProfileStatus,
  AircraftPerformanceSource,
  AircraftProfile,
  FixedWingAircraftClass,
  FuelQuantity,
  FuelQuantityUnit,
  PerformanceConditions,
  PerformanceInputKey,
  PerformancePhase,
  PerformanceTable,
  PerformanceTableOutput,
  PerformanceTableRow,
} from '@/types/planning';

const FUEL_UNITS = ['usg', 'litre', 'kg', 'lb'] as const;
const AIRCRAFT_CLASSES = ['piston', 'turboprop', 'jet'] as const;
const PROFILE_STATUSES = ['draft', 'approved', 'archived'] as const;
const PERFORMANCE_PHASES = ['taxi', 'climb', 'cruise', 'descent', 'holding'] as const;
const PERFORMANCE_INPUT_KEYS = [
  'weightLb',
  'altitudeFt',
  'temperatureC',
  'isaDeviationC',
  'powerPercent',
  'rpm',
  'torquePercent',
  'manifoldPressureInHg',
  'timeMinutes',
] as const;

const fuelQuantitySchema = z.object({
  value: z.number().finite().nonnegative(),
  unit: z.enum(FUEL_UNITS),
}).strict();

const sourceSchema = z.object({
  title: z.string().trim().min(2).max(160),
  revision: z.string().trim().max(80).optional(),
  page: z.string().trim().max(80).optional(),
  effectiveDate: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();

const conditionsSchema: z.ZodType<PerformanceConditions> = z.object({
  weightLb: z.number().finite().positive().optional(),
  altitudeFt: z.number().finite().min(-2000).max(60000).optional(),
  temperatureC: z.number().finite().min(-80).max(70).optional(),
  isaDeviationC: z.number().finite().min(-80).max(80).optional(),
  powerPercent: z.number().finite().min(0).max(120).optional(),
  rpm: z.number().finite().min(0).max(120000).optional(),
  torquePercent: z.number().finite().min(0).max(140).optional(),
  manifoldPressureInHg: z.number().finite().min(0).max(80).optional(),
  timeMinutes: z.number().finite().nonnegative().optional(),
  powerSetting: z.string().trim().max(80).optional(),
  mixtureSetting: z.string().trim().max(80).optional(),
}).strict();

const outputSchema: z.ZodType<PerformanceTableOutput> = z.object({
  fuel: fuelQuantitySchema.optional(),
  fuelFlowPerHour: fuelQuantitySchema.optional(),
  timeMinutes: z.number().finite().nonnegative().optional(),
  distanceNm: z.number().finite().nonnegative().optional(),
  trueAirspeedKts: z.number().finite().positive().optional(),
}).strict().refine((output) =>
  Boolean(output.fuel || output.fuelFlowPerHour || output.timeMinutes || output.distanceNm || output.trueAirspeedKts),
  'Performance row must include at least one output.'
);

const tableRowSchema: z.ZodType<PerformanceTableRow> = z.object({
  id: z.string().trim().max(120).optional(),
  conditions: conditionsSchema,
  output: outputSchema,
  notes: z.string().trim().max(1000).optional(),
}).strict();

const tableSchema: z.ZodType<PerformanceTable> = z.object({
  id: z.string().trim().min(1).max(120),
  phase: z.enum(PERFORMANCE_PHASES),
  title: z.string().trim().min(1).max(160),
  interpolationKeys: z.array(z.enum(PERFORMANCE_INPUT_KEYS)).max(5),
  rows: z.array(tableRowSchema).max(5000),
  sourceRef: z.string().trim().max(160).optional(),
}).strict();

export const aircraftPerformanceProfileSchema: z.ZodType<AircraftPerformanceProfile> = z.object({
  id: z.string().trim().min(1).max(120),
  ownerId: z.string().trim().max(160).optional(),
  registration: z.string().trim().min(1).max(40),
  aircraftType: z.string().trim().min(1).max(80),
  displayName: z.string().trim().min(1).max(160),
  aircraftClass: z.enum(AIRCRAFT_CLASSES),
  status: z.enum(PROFILE_STATUSES),
  source: sourceSchema,
  fuelUnit: z.enum(FUEL_UNITS),
  displayFuelUnit: z.enum(FUEL_UNITS),
  fuelDensityLbPerUsg: z.number().finite().min(1).max(10),
  usableFuel: fuelQuantitySchema,
  defaultTaxiFuel: fuelQuantitySchema.optional(),
  contingencyPercent: z.number().finite().min(0).max(50),
  finalReserveMinutes: z.number().finite().min(0).max(240),
  defaultHoldingMinutes: z.number().finite().min(0).max(240),
  tables: z.array(tableSchema).max(80),
  approvalNotes: z.string().trim().max(1000).optional(),
  approvedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
}).strict();

export function parseAircraftPerformanceProfile(input: unknown): AircraftPerformanceProfile {
  return aircraftPerformanceProfileSchema.parse(input);
}

export function createDraftPerformanceProfileFromAircraft(
  aircraft: AircraftProfile,
  now = new Date()
): AircraftPerformanceProfile {
  return {
    id: aircraft.performanceProfileId || `profile-${aircraft.id}`,
    registration: aircraft.registration,
    aircraftType: aircraft.type,
    displayName: `${aircraft.registration} ${aircraft.type}`.trim() || aircraft.name,
    aircraftClass: inferAircraftClass(aircraft.type),
    status: 'draft',
    source: {
      title: 'POH/AFM source not recorded',
    },
    fuelUnit: 'usg',
    displayFuelUnit: 'usg',
    fuelDensityLbPerUsg: aircraft.weightBalance?.fuel.weightPerGalLb ?? 6,
    usableFuel: { value: aircraft.usableFuelGal, unit: 'usg' },
    defaultTaxiFuel: aircraft.weightBalance?.fuel.taxiFuelGal !== undefined
      ? { value: aircraft.weightBalance.fuel.taxiFuelGal, unit: 'usg' }
      : undefined,
    contingencyPercent: aircraft.contingencyPercent,
    finalReserveMinutes: aircraft.reserveMinutes,
    defaultHoldingMinutes: 0,
    tables: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function applyProfileEdit(
  profile: AircraftPerformanceProfile,
  updates: Partial<AircraftPerformanceProfile>,
  now = new Date()
): AircraftPerformanceProfile {
  const nextStatus = profile.status === 'approved'
    ? 'draft'
    : updates.status === 'archived'
      ? 'archived'
      : profile.status;
  const next = parseAircraftPerformanceProfile({
    ...profile,
    ...updates,
    id: profile.id,
    status: nextStatus,
    approvedAt: undefined,
    updatedAt: now.toISOString(),
  });

  return next;
}

export function approveAircraftPerformanceProfile(
  profile: AircraftPerformanceProfile,
  notes?: string,
  now = new Date()
): AircraftPerformanceProfile {
  const validation = validateAircraftPerformanceProfile(profile);
  if (!validation.canApprove) {
    throw new Error(validation.issues.join(' '));
  }

  return parseAircraftPerformanceProfile({
    ...profile,
    status: 'approved',
    approvedAt: now.toISOString(),
    approvalNotes: notes?.trim() || profile.approvalNotes,
    updatedAt: now.toISOString(),
  });
}

export function validateAircraftPerformanceProfile(profile: AircraftPerformanceProfile): {
  canApprove: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!profile.source.title || profile.source.title === 'POH/AFM source not recorded') {
    issues.push('POH/AFM source title is required.');
  }

  if (profile.usableFuel.value <= 0) {
    issues.push('Usable fuel must be greater than zero.');
  }

  for (const phase of ['climb', 'cruise', 'descent', 'holding'] as PerformancePhase[]) {
    const table = profile.tables.find((item) => item.phase === phase && item.rows.length > 0);
    if (!table) {
      issues.push(`${phase} performance table is required.`);
      continue;
    }

    const tableIssues = validatePerformanceTable(table, profile.fuelUnit);
    issues.push(...tableIssues.map((issue) => `${table.title}: ${issue}`));
  }

  if (!profile.defaultTaxiFuel && !profile.tables.some((table) => table.phase === 'taxi' && table.rows.length > 0)) {
    issues.push('Taxi fuel or a taxi performance table is required.');
  }

  return {
    canApprove: issues.length === 0,
    issues,
  };
}

export function validatePerformanceTable(table: PerformanceTable, fuelUnit: FuelQuantityUnit): string[] {
  const issues: string[] = [];
  const seenRows = new Set<string>();

  for (const key of table.interpolationKeys) {
    const missingKey = table.rows.some((row) => typeof row.conditions[key] !== 'number');
    if (missingKey) {
      issues.push(`every row must include ${key} for interpolation.`);
    }
  }

  table.rows.forEach((row, index) => {
    if (row.output.fuel && row.output.fuel.unit !== fuelUnit) {
      issues.push(`row ${index + 1} fuel unit must match the profile fuel unit.`);
    }
    if (row.output.fuelFlowPerHour && row.output.fuelFlowPerHour.unit !== fuelUnit) {
      issues.push(`row ${index + 1} fuel-flow unit must match the profile fuel unit.`);
    }
    const outputIssue = validatePhaseOutput(table.phase, row.output);
    if (outputIssue) {
      issues.push(`row ${index + 1} ${outputIssue}`);
    }
    const key = JSON.stringify({
      phase: table.phase,
      conditions: row.conditions,
    });
    if (seenRows.has(key)) {
      issues.push(`row ${index + 1} duplicates another condition set.`);
    }
    seenRows.add(key);
  });

  return issues;
}

function validatePhaseOutput(phase: PerformancePhase, output: PerformanceTableOutput): string | null {
  if (phase === 'cruise' && !output.fuelFlowPerHour) {
    return 'must include cruise fuelFlowPerHour.';
  }

  if (phase === 'holding' && !output.fuelFlowPerHour) {
    return 'must include holding fuelFlowPerHour.';
  }

  if ((phase === 'taxi' || phase === 'climb' || phase === 'descent') && !output.fuel && !(output.fuelFlowPerHour && output.timeMinutes !== undefined)) {
    return `must include ${phase} fuel or fuelFlowPerHour plus timeMinutes.`;
  }

  return null;
}

export interface CsvPerformanceImportResult {
  tables: PerformanceTable[];
  rowCount: number;
}

const CSV_HEADERS = [
  'phase',
  'tableId',
  'title',
  'weightLb',
  'altitudeFt',
  'temperatureC',
  'isaDeviationC',
  'powerPercent',
  'rpm',
  'torquePercent',
  'manifoldPressureInHg',
  'timeMinutes',
  'powerSetting',
  'mixtureSetting',
  'fuel',
  'fuelFlowPerHour',
  'distanceNm',
  'trueAirspeedKts',
  'notes',
] as const;

export function exportPerformanceTablesCsv(tables: PerformanceTable[]): string {
  const lines = [CSV_HEADERS.join(',')];

  for (const table of tables) {
    for (const row of table.rows) {
      lines.push(CSV_HEADERS.map((header) => {
        if (header === 'phase') return table.phase;
        if (header === 'tableId') return table.id;
        if (header === 'title') return table.title;
        if (header === 'fuel') return formatCsvValue(row.output.fuel?.value);
        if (header === 'fuelFlowPerHour') return formatCsvValue(row.output.fuelFlowPerHour?.value);
        if (header === 'distanceNm') return formatCsvValue(row.output.distanceNm);
        if (header === 'trueAirspeedKts') return formatCsvValue(row.output.trueAirspeedKts);
        if (header === 'notes') return formatCsvValue(row.notes);
        return formatCsvValue(row.conditions[header as keyof PerformanceConditions]);
      }).join(','));
    }
  }

  return `${lines.join('\n')}\n`;
}

export function parsePerformanceTablesCsv(csv: string, fuelUnit: FuelQuantityUnit): CsvPerformanceImportResult {
  const records = parseCsv(csv);
  if (records.length < 2) {
    throw new Error('CSV must include a header row and at least one data row.');
  }

  const headers = records[0].map((header) => header.trim());
  const requiredHeaders = ['phase', 'tableId', 'title'];
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      throw new Error(`CSV is missing required ${header} header.`);
    }
  }

  const tablesById = new Map<string, PerformanceTable>();

  for (let rowIndex = 1; rowIndex < records.length; rowIndex += 1) {
    const record = recordToObject(headers, records[rowIndex]);
    const phase = parseEnum(record.phase, PERFORMANCE_PHASES, `row ${rowIndex + 1} phase`);
    const tableId = requireText(record.tableId, `row ${rowIndex + 1} tableId`);
    const title = requireText(record.title, `row ${rowIndex + 1} title`);
    const conditions = parseConditions(record);
    const output = parseOutput(record, fuelUnit);
    const existing = tablesById.get(tableId);
    const table = existing ?? {
      id: tableId,
      phase,
      title,
      interpolationKeys: inferInterpolationKeys(records, headers, tableId),
      rows: [],
    };

    if (table.phase !== phase) {
      throw new Error(`CSV table ${tableId} mixes phases.`);
    }

    table.rows.push({
      conditions,
      output,
      notes: record.notes?.trim() || undefined,
    });
    tablesById.set(tableId, table);
  }

  const tables = Array.from(tablesById.values());
  for (const table of tables) {
    const issues = validatePerformanceTable(table, fuelUnit);
    if (issues.length > 0) {
      throw new Error(`${table.title}: ${issues.join(' ')}`);
    }
  }

  return {
    tables,
    rowCount: records.length - 1,
  };
}

function parseConditions(record: Record<string, string>): PerformanceConditions {
  return {
    weightLb: parseOptionalNumber(record.weightLb),
    altitudeFt: parseOptionalNumber(record.altitudeFt),
    temperatureC: parseOptionalNumber(record.temperatureC),
    isaDeviationC: parseOptionalNumber(record.isaDeviationC),
    powerPercent: parseOptionalNumber(record.powerPercent),
    rpm: parseOptionalNumber(record.rpm),
    torquePercent: parseOptionalNumber(record.torquePercent),
    manifoldPressureInHg: parseOptionalNumber(record.manifoldPressureInHg),
    timeMinutes: parseOptionalNumber(record.timeMinutes),
    powerSetting: record.powerSetting?.trim() || undefined,
    mixtureSetting: record.mixtureSetting?.trim() || undefined,
  };
}

function parseOutput(record: Record<string, string>, fuelUnit: FuelQuantityUnit): PerformanceTableOutput {
  const fuel = parseOptionalNumber(record.fuel);
  const fuelFlowPerHour = parseOptionalNumber(record.fuelFlowPerHour);
  const output: PerformanceTableOutput = {
    fuel: fuel !== undefined ? { value: fuel, unit: fuelUnit } : undefined,
    fuelFlowPerHour: fuelFlowPerHour !== undefined ? { value: fuelFlowPerHour, unit: fuelUnit } : undefined,
    distanceNm: parseOptionalNumber(record.distanceNm),
    trueAirspeedKts: parseOptionalNumber(record.trueAirspeedKts),
  };

  const timeMinutes = parseOptionalNumber(record.timeMinutes);
  if (timeMinutes !== undefined) {
    output.timeMinutes = timeMinutes;
  }

  return outputSchema.parse(output);
}

function inferInterpolationKeys(records: string[][], headers: string[], tableId: string): PerformanceInputKey[] {
  const keys: PerformanceInputKey[] = [];
  const rowObjects = records.slice(1).map((record) => recordToObject(headers, record));
  const tableRows = rowObjects.filter((record) => record.tableId?.trim() === tableId);

  for (const key of PERFORMANCE_INPUT_KEYS) {
    const values = new Set(
      tableRows
        .map((record) => parseOptionalNumber(record[key]))
        .filter((value): value is number => value !== undefined)
        .map((value) => String(value))
    );
    if (values.size > 1) {
      keys.push(key);
    }
  }

  return keys.slice(0, 5);
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);

  return rows;
}

function recordToObject(headers: string[], values: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    record[header] = values[index] ?? '';
  });
  return record;
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const number = Number(trimmed);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid numeric value ${trimmed}.`);
  }
  return number;
}

function parseEnum<TValue extends string>(
  value: string | undefined,
  options: readonly TValue[],
  label: string
): TValue {
  const normalized = value?.trim();
  if (options.includes(normalized as TValue)) return normalized as TValue;
  throw new Error(`${label} must be one of ${options.join(', ')}.`);
}

function requireText(value: string | undefined, label: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  return trimmed;
}

function formatCsvValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function inferAircraftClass(type: string): FixedWingAircraftClass {
  const normalized = type.toLowerCase();
  if (/\b(tbm|pc-12|pc12|c208|caravan|king air|b200|turboprop)\b/.test(normalized)) return 'turboprop';
  if (/\b(citation|phenom|lear|jet|cj\d|mustang)\b/.test(normalized)) return 'jet';
  return 'piston';
}

export function isApprovedProfile(profile: AircraftPerformanceProfile | undefined): profile is AircraftPerformanceProfile {
  return Boolean(profile && profile.status === 'approved');
}

export function statusLabel(status: AircraftPerformanceProfileStatus): string {
  if (status === 'approved') return 'Approved';
  if (status === 'archived') return 'Archived';
  return 'Draft';
}

export function formatPerformanceSource(source: AircraftPerformanceSource): string {
  return [
    source.title,
    source.revision ? `rev ${source.revision}` : '',
    source.page ? `page ${source.page}` : '',
  ].filter(Boolean).join(', ');
}
