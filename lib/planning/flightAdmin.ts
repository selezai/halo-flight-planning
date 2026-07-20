import type {
  FlightAdminReview,
  FlightPlanFilingRecord,
  FlightPlanFilingStatus,
  FlightCloseReminder,
  FilingWorkflowReview,
  NotamBriefingRecord,
  NotamBriefingRecordStatus,
  RouteNotamReview,
  Waypoint,
} from '@/types/planning';
import {
  buildRouteNotamLocations,
  SOUTH_AFRICA_ATNS_FILE2FLY_URL,
  SOUTH_AFRICA_SACAA_NOTAM_SUMMARY_URL,
} from './notams';
import {
  buildFilingWorkflowReview,
  DEFAULT_CLOSE_REMINDER,
  DEFAULT_FILING_CHECKLIST,
  formatFilingWorkflowLines,
} from './filingReminder';

export const ATNS_AIM_DYNAMIC_DATA_URL = 'https://www.atns.com/products/aim/Dynamic%20Data';

export const DEFAULT_NOTAM_BRIEFING_RECORD: NotamBriefingRecord = {
  status: 'not-recorded',
  method: 'File2Fly / ATNS AIMU',
  sourceUrl: SOUTH_AFRICA_ATNS_FILE2FLY_URL,
};

export const DEFAULT_FLIGHT_PLAN_FILING_RECORD: FlightPlanFilingRecord = {
  status: 'not-filing',
  method: 'File2Fly / ATNS AIMU',
};

export function buildNotamRouteSignature(params: {
  waypoints: Waypoint[];
  departureTime?: string;
}): string {
  const route = params.waypoints
    .map((waypoint) => {
      const ident = waypoint.ident?.trim().toUpperCase();
      const coordinateToken = waypoint.coordinates
        .map((coordinate) => coordinate.toFixed(4))
        .join(',');
      return [
        waypoint.type,
        ident || waypoint.name.trim().toUpperCase() || waypoint.id,
        coordinateToken,
      ].join(':');
    })
    .join('|');

  return [
    route || 'NO-ROUTE',
    normalizeOptionalText(params.departureTime) || 'NO-ETD',
  ].join('@');
}

export function isNotamRecordStaleForRoute(
  record: NotamBriefingRecord,
  params: { waypoints?: Waypoint[]; departureTime?: string; routeSignature?: string }
): boolean {
  if (record.status !== 'completed') return false;
  if (!record.routeSignature) return false;

  const routeSignature = params.routeSignature ?? buildNotamRouteSignature({
    waypoints: params.waypoints ?? [],
    departureTime: params.departureTime,
  });

  return record.routeSignature !== routeSignature;
}

export function buildRoutePibRequestText(params: {
  waypoints: Waypoint[];
  departureTime?: string;
  cruiseAltitudeFt?: number;
  routeName?: string;
  routeNotamReview?: RouteNotamReview;
}): string {
  const locations = params.routeNotamReview?.locations.length
    ? params.routeNotamReview.locations
    : buildRouteNotamLocations(params.waypoints);
  const departure = params.waypoints[0];
  const destination = params.waypoints.at(-1);
  const routeText = params.waypoints.length
    ? params.waypoints.map(formatWaypointForPib).join(' DCT ')
    : 'route not entered in Halo';

  return [
    'Official briefing request for ATNS File2Fly / SACAA AIMU',
    `Route name: ${params.routeName || 'Not named in Halo'}`,
    `Departure: ${formatWaypointForPib(departure)}`,
    `Destination: ${formatWaypointForPib(destination)}`,
    `Route: ${routeText}`,
    `Planned ETD: ${params.departureTime || 'Not set in Halo'}`,
    `Cruise altitude: ${params.cruiseAltitudeFt ? `${Math.round(params.cruiseAltitudeFt)} ft` : 'Not set in Halo'}`,
    `Route/aerodrome locations to brief: ${locations.length ? locations.join(', ') : 'none prepared from route idents'}`,
    'Briefing required: route PIB, departure aerodrome PIB, destination aerodrome PIB, alternates if applicable, and relevant zone/FIR/airspace PIB.',
    'Halo does not retrieve, validate, or clear official NOTAMs. Pilot must obtain and review the official briefing.',
  ].join('\n');
}

export function buildFlightAdminReview(params: {
  notamRecord?: NotamBriefingRecord;
  flightPlanRecord?: FlightPlanFilingRecord;
  routeNotamReview?: RouteNotamReview;
  waypoints: Waypoint[];
  departureTime?: string;
  cruiseAltitudeFt?: number;
  routeName?: string;
  closeReminder?: FlightCloseReminder;
  closeReview?: FilingWorkflowReview;
  now?: Date;
  officialSourceUrl?: string;
}): FlightAdminReview {
  const now = params.now ?? new Date();
  const officialSourceUrl = params.officialSourceUrl ?? SOUTH_AFRICA_ATNS_FILE2FLY_URL;
  const notamRecord = {
    ...DEFAULT_NOTAM_BRIEFING_RECORD,
    ...params.notamRecord,
    sourceUrl: params.notamRecord?.sourceUrl ?? officialSourceUrl,
  };
  const flightPlanRecord = {
    ...DEFAULT_FLIGHT_PLAN_FILING_RECORD,
    ...params.flightPlanRecord,
  };
  const routeSignature = buildNotamRouteSignature({
    waypoints: params.waypoints,
    departureTime: params.departureTime,
  });
  const notamRecordStale = isNotamRecordStaleForRoute(notamRecord, { routeSignature });
  const notamStatus: NotamBriefingRecordStatus = notamRecordStale
    ? 'needs-rebrief'
    : notamRecord.status;
  const filingStatus = flightPlanRecord.status;
  const closeReview = params.closeReview ?? buildFilingWorkflowReview({
    checklist: DEFAULT_FILING_CHECKLIST,
    closeReminder: params.closeReminder ?? DEFAULT_CLOSE_REMINDER,
    now,
    officialSourceUrl,
  });

  const stop = filingStatus === 'rejected' || closeReview.status === 'overdue';
  const review = notamStatus === 'needs-rebrief' || closeReview.status === 'due-soon';
  const status: FlightAdminReview['status'] = stop ? 'stop' : review ? 'review' : 'ready';

  return {
    status,
    message: buildAdminMessage(status, notamStatus, filingStatus, closeReview.status),
    officialSourceUrl,
    notamRecord,
    notamStatus,
    notamRecordStale,
    notamMessage: messageForNotamStatus(notamStatus, notamRecord),
    flightPlanRecord,
    filingStatus,
    filingMessage: messageForFilingStatus(filingStatus, flightPlanRecord),
    routePibRequestText: buildRoutePibRequestText({
      waypoints: params.waypoints,
      departureTime: params.departureTime,
      cruiseAltitudeFt: params.cruiseAltitudeFt,
      routeName: params.routeName,
      routeNotamReview: params.routeNotamReview,
    }),
    routeSignature,
    updatedAt: now.toISOString(),
  };
}

export function formatFlightAdminLines(
  review?: FlightAdminReview,
  closeReview?: FilingWorkflowReview
): string[] {
  if (!review) {
    return [
      'Status: NOT RECORDED IN HALO',
      manualActionDisclaimer(),
      `File2Fly: ${SOUTH_AFRICA_ATNS_FILE2FLY_URL}`,
      `ATNS AIM dynamic data: ${ATNS_AIM_DYNAMIC_DATA_URL}`,
      `SACAA NOTAM summaries: ${SOUTH_AFRICA_SACAA_NOTAM_SUMMARY_URL}`,
    ];
  }

  const lines = [
    `Status: ${review.status.toUpperCase()} - ${review.message}`,
    manualActionDisclaimer(),
    `Official source: ${review.officialSourceUrl}`,
    `ATNS AIM dynamic data: ${ATNS_AIM_DYNAMIC_DATA_URL}`,
    `SACAA NOTAM summaries: ${SOUTH_AFRICA_SACAA_NOTAM_SUMMARY_URL}`,
    '',
    `NOTAM record: ${formatNotamRecordStatus(review.notamStatus)} - ${review.notamMessage}`,
    `NOTAM method/source: ${review.notamRecord.method || 'not recorded'}`,
    `NOTAM reference: ${review.notamRecord.reference || 'not recorded'}`,
    `NOTAM completed at: ${review.notamRecord.completedAt || 'not recorded'}`,
    `NOTAM notes: ${review.notamRecord.notes || 'none'}`,
    '',
    'Route PIB request text:',
    ...review.routePibRequestText.split('\n').map((line) => `  ${line}`),
    '',
    `Flight plan filing: ${formatFilingStatus(review.filingStatus)} - ${review.filingMessage}`,
    `Filing method/source: ${review.flightPlanRecord.method || 'not recorded'}`,
    `Filing reference: ${review.flightPlanRecord.reference || 'not recorded'}`,
    `Filed at: ${review.flightPlanRecord.filedAt || 'not recorded'}`,
    `Accepted at: ${review.flightPlanRecord.acceptedAt || 'not recorded'}`,
    `Closed at: ${review.flightPlanRecord.closedAt || 'not recorded'}`,
    `Responsible contact: ${review.flightPlanRecord.responsibleContact || 'not recorded'}`,
    `Filing notes: ${review.flightPlanRecord.notes || 'none'}`,
  ];

  if (closeReview) {
    lines.push('', 'Close reminder:', ...formatFilingWorkflowLines(closeReview));
  }

  return lines;
}

export function manualActionDisclaimer(): string {
  return 'Manual action: Halo did not retrieve official NOTAMs, file a flight plan, submit changes, cancel, or close any flight plan automatically.';
}

export function formatNotamRecordStatus(status: NotamBriefingRecordStatus): string {
  const labels: Record<NotamBriefingRecordStatus, string> = {
    'not-recorded': 'NOT RECORDED IN HALO',
    completed: 'OFFICIAL BRIEFING RECORDED',
    'not-applicable': 'NOT APPLICABLE / PILOT WAIVED',
    'needs-rebrief': 'NEEDS REBRIEF',
  };
  return labels[status];
}

export function formatFilingStatus(status: FlightPlanFilingStatus): string {
  const labels: Record<FlightPlanFilingStatus, string> = {
    'not-filing': 'NOT FILING / NOT APPLICABLE',
    preparing: 'PREPARING',
    'filed-manually': 'FILED MANUALLY',
    accepted: 'ACCEPTED',
    rejected: 'REJECTED',
    cancelled: 'CANCELLED',
    closed: 'CLOSED',
  };
  return labels[status];
}

function buildAdminMessage(
  status: FlightAdminReview['status'],
  notamStatus: NotamBriefingRecordStatus,
  filingStatus: FlightPlanFilingStatus,
  closeStatus: FilingWorkflowReview['status']
): string {
  if (filingStatus === 'rejected') {
    return 'Official flight-plan filing is marked rejected. Resolve with File2Fly/ARO before dispatch.';
  }
  if (closeStatus === 'overdue') {
    return 'Close-flight reminder is overdue. Close through the official source or contact the responsible person.';
  }
  if (notamStatus === 'needs-rebrief') {
    return 'Official NOTAM briefing was recorded for a different route or ETD. Rebrief or mark not applicable.';
  }
  if (closeStatus === 'due-soon') {
    return 'Close-flight reminder is due soon.';
  }
  if (status === 'ready') {
    return 'Flight admin records are optional and available in the briefing pack.';
  }
  return 'Flight admin record needs pilot review.';
}

function messageForNotamStatus(status: NotamBriefingRecordStatus, record: NotamBriefingRecord): string {
  if (status === 'completed') {
    return `Pilot recorded official NOTAM briefing${record.completedAt ? ` at ${record.completedAt}` : ''}.`;
  }
  if (status === 'not-applicable') {
    return 'Pilot marked official NOTAM record not applicable for this plan.';
  }
  if (status === 'needs-rebrief') {
    return 'Recorded briefing no longer matches the current route/ETD in Halo.';
  }
  return 'Official NOTAM briefing is not recorded in Halo.';
}

function messageForFilingStatus(status: FlightPlanFilingStatus, record: FlightPlanFilingRecord): string {
  if (status === 'not-filing') {
    return record.notes || 'Pilot marked flight-plan filing not applicable/not being filed in Halo.';
  }
  if (status === 'preparing') return 'Pilot is preparing a manual File2Fly/official filing handoff.';
  if (status === 'filed-manually') {
    return `Pilot marked the flight plan filed manually${record.reference ? `, reference ${record.reference}` : ''}.`;
  }
  if (status === 'accepted') {
    return `Pilot marked the flight plan accepted${record.reference ? `, reference ${record.reference}` : ''}.`;
  }
  if (status === 'rejected') {
    return `Pilot marked the official filing rejected${record.reference ? `, reference ${record.reference}` : ''}.`;
  }
  if (status === 'cancelled') return 'Pilot marked the flight plan cancelled through an official channel.';
  return 'Pilot marked the flight plan closed through an official channel.';
}

function formatWaypointForPib(waypoint?: Waypoint): string {
  if (!waypoint) return 'not entered in Halo';
  return waypoint.ident?.trim().toUpperCase() || waypoint.name || waypoint.id;
}

function normalizeOptionalText(value?: string): string {
  return value?.trim() ?? '';
}
