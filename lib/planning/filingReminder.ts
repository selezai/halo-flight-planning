import type {
  FilingChecklistState,
  FilingWorkflowReview,
  FlightCloseReminder,
} from '@/types/planning';
import { SOUTH_AFRICA_ATNS_FILE2FLY_URL } from './notams';

export const DEFAULT_FILING_CHECKLIST: FilingChecklistState = {
  routeReviewed: false,
  weatherReviewed: false,
  notamPibObtained: false,
  weightBalanceReviewed: false,
  fuelReviewed: false,
  filedViaOfficialSource: false,
};

export const DEFAULT_CLOSE_REMINDER: FlightCloseReminder = {
  enabled: false,
};

const DUE_SOON_MINUTES = 30;

export function buildFilingWorkflowReview(params: {
  checklist: FilingChecklistState;
  closeReminder: FlightCloseReminder;
  now?: Date;
  officialSourceUrl?: string;
}): FilingWorkflowReview {
  const now = params.now ?? new Date();
  const officialSourceUrl = params.officialSourceUrl ?? SOUTH_AFRICA_ATNS_FILE2FLY_URL;
  const completion = getFilingChecklistCompletion(params.checklist);
  const closeByDate = parseOptionalDate(params.closeReminder.closeByTime);
  const plannedArrivalDate = parseOptionalDate(params.closeReminder.plannedArrivalTime);
  const plannedDepartureDate = parseOptionalDate(params.closeReminder.plannedDepartureTime);
  const acknowledgedDate = parseOptionalDate(params.closeReminder.acknowledgedAt);
  const checklistComplete = completion.complete === completion.total;

  if (acknowledgedDate) {
    return {
      status: 'closed',
      checklistComplete,
      checklistItemsComplete: completion.complete,
      checklistItemsTotal: completion.total,
      message: `Flight close acknowledged at ${acknowledgedDate.toISOString()}.`,
      officialSourceUrl,
      plannedDepartureTime: plannedDepartureDate?.toISOString(),
      plannedArrivalTime: plannedArrivalDate?.toISOString(),
      closeByTime: closeByDate?.toISOString(),
    };
  }

  if (!params.closeReminder.enabled || !closeByDate) {
    return {
      status: 'not-planned',
      checklistComplete,
      checklistItemsComplete: completion.complete,
      checklistItemsTotal: completion.total,
      message: 'Set planned arrival and close-by time. Halo will not file or close the flight plan automatically.',
      officialSourceUrl,
      plannedDepartureTime: plannedDepartureDate?.toISOString(),
      plannedArrivalTime: plannedArrivalDate?.toISOString(),
    };
  }

  const minutesUntilClose = Math.round((closeByDate.getTime() - now.getTime()) / 60000);
  const status = minutesUntilClose < 0
    ? 'overdue'
    : minutesUntilClose <= DUE_SOON_MINUTES
      ? 'due-soon'
      : 'planned';

  return {
    status,
    checklistComplete,
    checklistItemsComplete: completion.complete,
    checklistItemsTotal: completion.total,
    message: messageForStatus(status, minutesUntilClose),
    officialSourceUrl,
    plannedDepartureTime: plannedDepartureDate?.toISOString(),
    plannedArrivalTime: plannedArrivalDate?.toISOString(),
    closeByTime: closeByDate.toISOString(),
    minutesUntilClose,
  };
}

export function getFilingChecklistCompletion(checklist: FilingChecklistState): { complete: number; total: number } {
  const values = [
    checklist.routeReviewed,
    checklist.weatherReviewed,
    checklist.notamPibObtained,
    checklist.weightBalanceReviewed,
    checklist.fuelReviewed,
    checklist.filedViaOfficialSource,
  ];

  return {
    complete: values.filter(Boolean).length,
    total: values.length,
  };
}

export function buildCloseReminderFromDeparture(params: {
  departureTime?: string;
  estimatedTimeMinutes: number;
  closeBufferMinutes?: number;
}): FlightCloseReminder {
  const departure = parseOptionalDate(params.departureTime);
  if (!departure) {
    return {
      enabled: true,
    };
  }

  const arrival = new Date(departure.getTime() + Math.max(0, params.estimatedTimeMinutes) * 60000);
  const closeBy = new Date(arrival.getTime() + (params.closeBufferMinutes ?? 30) * 60000);

  return {
    enabled: true,
    plannedDepartureTime: toLocalDateTimeInputValue(departure),
    plannedArrivalTime: toLocalDateTimeInputValue(arrival),
    closeByTime: toLocalDateTimeInputValue(closeBy),
  };
}

export function formatFilingWorkflowLines(review?: FilingWorkflowReview): string[] {
  if (!review) {
    return [
      'Status: NOT PLANNED',
      'Use ATNS File2Fly / SACAA official sources for filing and briefing. Halo does not file automatically.',
    ];
  }

  return [
    `Status: ${review.status.toUpperCase()} - ${review.message}`,
    `Checklist: ${review.checklistItemsComplete}/${review.checklistItemsTotal}${review.checklistComplete ? ' complete' : ' complete; remaining items require pilot action'}`,
    `Official source: ${review.officialSourceUrl}`,
    `Planned departure: ${review.plannedDepartureTime ?? 'not set'}`,
    `Planned arrival: ${review.plannedArrivalTime ?? 'not set'}`,
    `Close by: ${review.closeByTime ?? 'not set'}`,
  ];
}

function messageForStatus(status: FilingWorkflowReview['status'], minutesUntilClose: number): string {
  if (status === 'overdue') {
    return `Flight close reminder is overdue by ${Math.abs(minutesUntilClose)} minute${Math.abs(minutesUntilClose) === 1 ? '' : 's'}. Close through the official source or contact the responsible person.`;
  }

  if (status === 'due-soon') {
    return `Flight close reminder is due in ${minutesUntilClose} minute${minutesUntilClose === 1 ? '' : 's'}.`;
  }

  return `Flight close reminder is planned for ${minutesUntilClose} minute${minutesUntilClose === 1 ? '' : 's'} from now.`;
}

function parseOptionalDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : undefined;
}

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('');
}
