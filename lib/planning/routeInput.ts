import type { Coordinates, Waypoint } from '@/types/planning';
import { validateCoordinates } from '@/lib/planning/navigation';

export type ParsedRouteInputItem =
  | {
      kind: 'coordinate';
      source: string;
      coordinates: Coordinates;
    }
  | {
      kind: 'query';
      source: string;
      query: string;
    };

export interface ParsedRouteInput {
  items: ParsedRouteInputItem[];
  errors: string[];
}

const ROUTE_SEPARATOR_RE = /\s*(?:->|\u2192|;|\n|\/)\s*/;
const QUERY_SEPARATOR_RE = /[\s,]+/;
const QUERY_TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9-]{1,11}$/;
const UNSAFE_CONTROL_CHAR_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const COORDINATE_PART_RE = /([NSEW])?\s*([+-]?\d+(?:\.\d+)?)\s*([NSEW])?/gi;

interface CoordinatePart {
  value: number;
  axis: 'latitude' | 'longitude' | null;
}

export function parseRouteInputItems(input: string): ParsedRouteInput {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return {
      items: [],
      errors: ['Enter at least two route points.'],
    };
  }

  if (UNSAFE_CONTROL_CHAR_RE.test(trimmedInput)) {
    return {
      items: [],
      errors: ['Route input contains unsupported control characters.'],
    };
  }

  const items: ParsedRouteInputItem[] = [];
  const errors: string[] = [];
  const routeParts = trimmedInput
    .replace(/\r\n?/g, '\n')
    .split(ROUTE_SEPARATOR_RE)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of routeParts) {
    const coordinates = parseCoordinatePair(part);

    if (coordinates) {
      items.push({
        kind: 'coordinate',
        source: part,
        coordinates,
      });
      continue;
    }

    if (looksLikeCoordinatePair(part)) {
      errors.push(`"${part}" is not a valid coordinate pair.`);
      continue;
    }

    const tokens = part
      .split(QUERY_SEPARATOR_RE)
      .map((token) => token.trim())
      .filter(Boolean);

    for (const token of tokens) {
      const query = token.toUpperCase();

      if (!QUERY_TOKEN_RE.test(query)) {
        errors.push(`"${token}" is not a supported waypoint identifier or coordinate pair.`);
        continue;
      }

      items.push({
        kind: 'query',
        source: token,
        query,
      });
    }
  }

  if (items.length === 0 && errors.length === 0) {
    errors.push('Enter at least two route points.');
  }

  return {
    items,
    errors: Array.from(new Set(errors)),
  };
}

export function createRouteCoordinateWaypoint(
  coordinates: Coordinates,
  index: number,
  source?: string
): Waypoint {
  validateCoordinates(coordinates);

  return {
    id: `typed-route-${Date.now()}-${index}`,
    type: 'user',
    name: `Typed coordinate ${index}`,
    ident: `PT${String(index).padStart(2, '0')}`,
    coordinates,
    notes: source ? `Typed route coordinate: ${source}` : undefined,
  };
}

function parseCoordinatePair(input: string): Coordinates | null {
  if (!hasCoordinateSyntax(input)) return null;

  const parts = extractCoordinateParts(input);

  if (parts.length !== 2) return null;

  const latitudePart = parts.find((part) => part.axis === 'latitude');
  const longitudePart = parts.find((part) => part.axis === 'longitude');

  if (latitudePart && longitudePart) {
    return validatedCoordinates([longitudePart.value, latitudePart.value]);
  }

  if (latitudePart) {
    const longitude = parts.find((part) => part !== latitudePart);
    return longitude ? validatedCoordinates([longitude.value, latitudePart.value]) : null;
  }

  if (longitudePart) {
    const latitude = parts.find((part) => part !== longitudePart);
    return latitude ? validatedCoordinates([longitudePart.value, latitude.value]) : null;
  }

  const [first, second] = parts;
  const looksLikeLongitudeFirst = Math.abs(first.value) > 90 && Math.abs(second.value) <= 90;
  const latitude = looksLikeLongitudeFirst ? second.value : first.value;
  const longitude = looksLikeLongitudeFirst ? first.value : second.value;

  return validatedCoordinates([longitude, latitude]);
}

function looksLikeCoordinatePair(input: string): boolean {
  const parts = extractCoordinateParts(input);
  return parts.length >= 2 && hasCoordinateSyntax(input);
}

function hasCoordinateSyntax(input: string): boolean {
  return /[+-]?\d+(?:\.\d+)?\s*,\s*[+-]?\d/.test(input) ||
    /(?:[NSEW]\s*[+-]?\d|[+-]?\d+(?:\.\d+)?\s*[NSEW])/i.test(input);
}

function extractCoordinateParts(input: string): CoordinatePart[] {
  const matches: CoordinatePart[] = [];
  COORDINATE_PART_RE.lastIndex = 0;

  for (const match of input.matchAll(COORDINATE_PART_RE)) {
    const value = Number(match[2]);
    const hemisphere = `${match[1] ?? match[3] ?? ''}`.toUpperCase();

    if (!Number.isFinite(value)) continue;

    matches.push({
      value: applyHemisphere(value, hemisphere),
      axis: getCoordinateAxis(hemisphere),
    });
  }

  return matches;
}

function applyHemisphere(value: number, hemisphere: string): number {
  if (hemisphere === 'S' || hemisphere === 'W') return -Math.abs(value);
  if (hemisphere === 'N' || hemisphere === 'E') return Math.abs(value);
  return value;
}

function getCoordinateAxis(hemisphere: string): CoordinatePart['axis'] {
  if (hemisphere === 'N' || hemisphere === 'S') return 'latitude';
  if (hemisphere === 'E' || hemisphere === 'W') return 'longitude';
  return null;
}

function validatedCoordinates(coordinates: Coordinates): Coordinates | null {
  try {
    validateCoordinates(coordinates);
    return coordinates;
  } catch {
    return null;
  }
}
