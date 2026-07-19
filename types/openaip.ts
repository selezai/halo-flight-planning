// OpenAIP API Response Types

export interface OpenAipAirport {
  _id: string;
  name: string;
  icaoCode?: string;
  iataCode?: string;
  altIdentifier?: string;
  type: AirportType;
  country: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  elevation: {
    value: number;
    unit: ElevationUnit;
    referenceDatum: number;
  };
  trafficType?: number[];
  ppr?: boolean;
  private?: boolean;
  skydiving?: boolean;
  winchOnly?: boolean;
  runways?: OpenAipRunway[];
  frequencies?: OpenAipFrequency[];
  fuelTypes?: number[];
  handlingFacilities?: number[];
  passengerFacilities?: number[];
  gliderTowing?: number[];
  hoursOfOperation?: string;
  remarks?: string;
  approved?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface OpenAipRunway {
  designator: string;
  trueHeading: number;
  alignedTrueNorth?: boolean;
  operations?: number;
  mainRunway?: boolean;
  turnDirection?: number;
  landingOnly?: boolean;
  takeOffOnly?: boolean;
  dimension: {
    length: { value: number; unit: number };
    width: { value: number; unit: number };
  };
  surface: {
    mainComposite: number;
    secondaryComposite?: number;
    frictionCoefficient?: number;
    loadBearingCapacity?: number;
  };
  thresholdDisplacement?: { value: number; unit: number };
  tora?: { value: number; unit: number };
  toda?: { value: number; unit: number };
  asda?: { value: number; unit: number };
  lda?: { value: number; unit: number };
  lightingTypes?: number[];
  approachLightingTypes?: number[];
  remarks?: string;
}

export interface OpenAipFrequency {
  value: string;
  unit: number;
  type: FrequencyType;
  name?: string;
  primary?: boolean;
  remarks?: string;
}

export interface OpenAipNavaid {
  _id: string;
  name: string;
  identifier: string;
  type: NavaidType;
  country: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  elevation?: {
    value: number;
    unit: ElevationUnit;
    referenceDatum: number;
  };
  frequency?: {
    value: string;
    unit: number;
  };
  channel?: string;
  range?: {
    value: number;
    unit: number;
  };
  magneticDeclination?: number;
  alignedTrueNorth?: boolean;
  hoursOfOperation?: string;
  remarks?: string;
}

export interface OpenAipAirspace {
  _id: string;
  name: string;
  type: AirspaceType;
  icaoClass?: AirspaceClass;
  country: string;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  upperLimit: AltitudeLimit;
  lowerLimit: AltitudeLimit;
  activity?: string;
  onRequest?: boolean;
  byNotam?: boolean;
  hoursOfOperation?: string;
  remarks?: string;
}

export interface AltitudeLimit {
  value: number;
  unit: AltitudeUnit;
  referenceDatum: AltitudeReference;
}

// Enums based on OpenAIP API schema

export enum AirportType {
  CLOSED = 0,
  AF_CIVIL = 1,
  AF_MIL_CIVIL = 2,
  AF_WATER = 3,
  HELI_CIVIL = 4,
  HELI_MIL_CIVIL = 5,
  AF_MIL = 6,
  INTL_APT = 7,
  LIGHT_AIRCRAFT = 8,
  GLIDING = 9,
  HELI_HOSPITAL = 10,
  UL = 11,
  PARACHUTE = 12,
  AF_RESTRICTED = 13,
  BALLOON = 14,
}

export const AirportTypeLabels: Record<AirportType, string> = {
  [AirportType.CLOSED]: 'Closed',
  [AirportType.AF_CIVIL]: 'Airfield Civil',
  [AirportType.AF_MIL_CIVIL]: 'Airfield Military/Civil',
  [AirportType.AF_WATER]: 'Water Airfield',
  [AirportType.HELI_CIVIL]: 'Heliport Civil',
  [AirportType.HELI_MIL_CIVIL]: 'Heliport Military/Civil',
  [AirportType.AF_MIL]: 'Airfield Military',
  [AirportType.INTL_APT]: 'International Airport',
  [AirportType.LIGHT_AIRCRAFT]: 'Light Aircraft Field',
  [AirportType.GLIDING]: 'Gliding Field',
  [AirportType.HELI_HOSPITAL]: 'Hospital Heliport',
  [AirportType.UL]: 'Ultralight Field',
  [AirportType.PARACHUTE]: 'Parachute Jump Site',
  [AirportType.AF_RESTRICTED]: 'Restricted Airfield',
  [AirportType.BALLOON]: 'Balloon Launch Site',
};

export enum NavaidType {
  DME = 0,
  NDB = 1,
  TACAN = 2,
  VOR = 3,
  VOR_DME = 4,
  VORTAC = 5,
  DVOR = 6,
  DVOR_DME = 7,
  DVORTAC = 8,
}

export const NavaidTypeLabels: Record<NavaidType, string> = {
  [NavaidType.DME]: 'DME',
  [NavaidType.NDB]: 'NDB',
  [NavaidType.TACAN]: 'TACAN',
  [NavaidType.VOR]: 'VOR',
  [NavaidType.VOR_DME]: 'VOR-DME',
  [NavaidType.VORTAC]: 'VORTAC',
  [NavaidType.DVOR]: 'DVOR',
  [NavaidType.DVOR_DME]: 'DVOR-DME',
  [NavaidType.DVORTAC]: 'DVORTAC',
};

export enum AirspaceType {
  OTHER = 0,
  RESTRICTED = 1,
  DANGER = 2,
  PROHIBITED = 3,
  CTR = 4,
  TMZ = 5,
  RMZ = 6,
  TMA = 7,
  TRA = 8,
  TSA = 9,
  FIR = 10,
  UIR = 11,
  ADIZ = 12,
  ATZ = 13,
  MATZ = 14,
  AIRWAY = 15,
  MTR = 16,
  ALERT_AREA = 17,
  WARNING_AREA = 18,
  PROTECTED_AREA = 19,
  HTZ = 20,
  GLIDING_SECTOR = 21,
  TRP = 22,
  TIZ = 23,
  TIA = 24,
  MTA = 25,
  CTA = 26,
  ACC_SECTOR = 27,
  AERIAL_SPORTING = 28,
  OVERFLIGHT_RESTRICTION = 29,
  MRT = 30,
  TFR = 31,
  VFR_SECTOR = 32,
  FIS_SECTOR = 33,
  AWY_LO = 34,
  AWY_HI = 35,
  CTR_P = 36,
  TMA_P = 37,
}

export enum AirspaceClass {
  A = 0,
  B = 1,
  C = 2,
  D = 3,
  E = 4,
  F = 5,
  G = 6,
  SUA = 7,
}

export const AirspaceClassLabels: Record<AirspaceClass, string> = {
  [AirspaceClass.A]: 'Class A',
  [AirspaceClass.B]: 'Class B',
  [AirspaceClass.C]: 'Class C',
  [AirspaceClass.D]: 'Class D',
  [AirspaceClass.E]: 'Class E',
  [AirspaceClass.F]: 'Class F',
  [AirspaceClass.G]: 'Class G',
  [AirspaceClass.SUA]: 'Special Use Airspace',
};

export enum FrequencyType {
  APPROACH = 0,
  APRON = 1,
  ARRIVAL = 2,
  CENTER = 3,
  CTAF = 4,
  DELIVERY = 5,
  DEPARTURE = 6,
  FIS = 7,
  GLIDING = 8,
  GROUND = 9,
  INFO = 10,
  MULTICOM = 11,
  UNICOM = 12,
  RADAR = 13,
  TOWER = 14,
  ATIS = 15,
  RADIO = 16,
  OTHER = 17,
  AIRMET = 18,
  AWOS = 19,
  LIGHT = 20,
  VOLMET = 21,
  AFIS = 22,
}

export const FrequencyTypeLabels: Record<FrequencyType, string> = {
  [FrequencyType.APPROACH]: 'APP',
  [FrequencyType.APRON]: 'APRON',
  [FrequencyType.ARRIVAL]: 'ARR',
  [FrequencyType.CENTER]: 'CTR',
  [FrequencyType.CTAF]: 'CTAF',
  [FrequencyType.DELIVERY]: 'DEL',
  [FrequencyType.DEPARTURE]: 'DEP',
  [FrequencyType.FIS]: 'FIS',
  [FrequencyType.GLIDING]: 'GLD',
  [FrequencyType.GROUND]: 'GND',
  [FrequencyType.INFO]: 'INFO',
  [FrequencyType.MULTICOM]: 'MULTI',
  [FrequencyType.UNICOM]: 'UNIC',
  [FrequencyType.RADAR]: 'RDR',
  [FrequencyType.TOWER]: 'TWR',
  [FrequencyType.ATIS]: 'ATIS',
  [FrequencyType.RADIO]: 'RDO',
  [FrequencyType.OTHER]: 'OTH',
  [FrequencyType.AIRMET]: 'AIRMET',
  [FrequencyType.AWOS]: 'AWOS',
  [FrequencyType.LIGHT]: 'LIGHT',
  [FrequencyType.VOLMET]: 'VOLMET',
  [FrequencyType.AFIS]: 'AFIS',
};

export enum ElevationUnit {
  METER = 1,
  FEET = 6,
}

export enum AltitudeUnit {
  METER = 1,
  FEET = 6,
  FL = 7,
}

export enum AltitudeReference {
  GND = 0,
  MSL = 1,
  STD = 2,
}

// Parsed feature from vector tiles (for sidebar display)
export interface ParsedFeature {
  type: 'airport' | 'navaid' | 'airspace' | 'unknown';
  sourceId?: string;
  sourceLayer?: string;
  
  // Common fields
  name?: string;
  country?: string;
  coordinates?: [number, number];
  elevation?: number;
  elevationUnit?: string;
  
  // Airport-specific
  icao?: string;
  iata?: string;
  airportType?: string;
  trafficTypes?: string[];
  frequencies?: Array<{ type: string; value: string }>;
  runways?: Array<{
    designator: string;
    length: number;
    width: number;
    surface: string;
    unit: string;
  }>;
  ppr?: boolean;
  private?: boolean;
  
  // Navaid-specific
  identifier?: string;
  navaidType?: string;
  frequency?: string;
  channel?: string;
  magneticDeclination?: number;
  alignedTrueNorth?: boolean;
  
  // Airspace-specific
  airspaceType?: string;
  airspaceClass?: string;
  upperLimit?: string;
  lowerLimit?: string;
  activity?: string;
  
  // Metadata
  hoursOfOperation?: string;
  remarks?: string;
  enriched?: boolean;
  raw?: Record<string, unknown>;
}

// API Response wrapper
export interface OpenAipListResponse<T> {
  limit: number;
  totalCount: number;
  totalPages: number;
  page: number;
  items: T[];
}
