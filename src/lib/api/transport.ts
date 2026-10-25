import { api, uploadFile } from './client';
import { Move, moveBody } from '@/lib/order';

/** Transport and live bus tracking (cmsbackend/src/modules/transport). */

export type TripKind = 'morning' | 'afternoon' | 'special';
export type Way = 'both' | 'pickup' | 'drop';
export type LatLng = { lat: number; lng: number };

export interface Vehicle {
  id: string;
  number: string;
  name: string;
  typeId: string | null;
  type: string | null;
  capacity: number;
  make: string | null;
  model: string | null;
  year: number | null;
  gpsDeviceId: string | null;
  notes: string | null;
  isActive: boolean;
  routes: string[];
  expired: number;
  expiring: number;
}
export type VehicleInput = Pick<Vehicle, 'number' | 'name' | 'typeId' | 'capacity' | 'make' | 'model' | 'year' | 'gpsDeviceId' | 'notes' | 'isActive'>;

export interface VehiclePaper {
  id: string;
  typeId: string | null;
  type: string;
  number: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  expired: boolean;
  expiring: boolean;
  fileId: string | null;
  fileName: string | null;
  notes: string | null;
}
export type PaperInput = { typeId: string | null; number: string | null; issuedOn: string | null; expiresOn: string | null; fileId: string | null; notes: string | null };

export interface Stop {
  id: string;
  routeId: string;
  name: string;
  landmark: string | null;
  lat: number | null;
  lng: number | null;
  sortOrder: number;
  morningTime: string | null;
  afternoonTime: string | null;
  fare: number;
  isActive: boolean;
  students: number;
}
export type StopInput = { name: string; landmark: string | null; lat: number | null; lng: number | null; morningTime: string | null; afternoonTime: string | null; fare: number; isActive: boolean };

export interface Route {
  id: string;
  name: string;
  code: string | null;
  vehicleId: string | null;
  driverId: string | null;
  helperId: string | null;
  morningStart: string;
  afternoonStart: string;
  color: string;
  isActive: boolean;
  vehicle: string | null;
  capacity: number | null;
  driver: { name: string; mobile: string | null } | null;
  helper: { name: string; mobile: string | null } | null;
  students: number;
  stops: Stop[];
}
export type RouteInput = Pick<Route, 'name' | 'code' | 'vehicleId' | 'driverId' | 'helperId' | 'morningStart' | 'afternoonStart' | 'color' | 'isActive'>;

export interface StudentRow {
  id: string;
  name: string;
  admissionNo: string;
  roll: number | null;
  section: string;
  transport: { id: string; routeId: string; route: string; stopId: string; stop: string; way: Way; fromDate: string; toDate: string | null; fare: number | null; ownFare: boolean } | null;
}

export interface TripStop {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  time: string | null;
  reachedAt: string | null;
  passed: boolean;
  students: { id: string; name: string; admissionNo: string; mark: 'boarded' | 'dropped' | 'absent' | null }[];
}
export interface TripView {
  id: string;
  kind: TripKind;
  status: 'running' | 'done';
  source: 'phone' | 'device' | 'simulated';
  route: string;
  vehicle: string;
  color: string;
  startedAt: string;
  endedAt: string | null;
  last: { lat: number; lng: number; speed: number | null; at: string } | null;
  nextStop: number;
  delayMin: number;
  school: LatLng;
  stops: TripStop[];
  events: { kind: string; at: string; note: string | null; stopId: string | null; studentId: string | null }[];
  path: [number, number][];
}

export interface LiveBus {
  routeId: string;
  route: string;
  color: string;
  vehicle: string | null;
  tripId: string | null;
  kind: TripKind | null;
  state: 'moving' | 'late' | 'no_signal' | 'done' | 'not_started';
  last: { lat: number; lng: number; speed: number | null; at: string } | null;
  nextStop: number;
  stops: number;
  delayMin: number;
  sos: { at: string; note: string | null }[];
}
export interface Live {
  school: LatLng;
  pingSeconds: number;
  map: string;
  buses: LiveBus[];
}

export interface Connect {
  mapProvider: 'osm' | 'google';
  googleKeySet: boolean;
  gpsProvider: 'none' | 'traccar' | 'generic';
  gpsUrl: string;
  gpsKeySet: boolean;
  autoTrips: boolean;
  vehicles: { id: string; name: string; number: string; gpsDeviceId: string | null }[];
}
export type ConnectInput = { mapProvider: Connect['mapProvider']; googleKey?: string; gpsProvider: Connect['gpsProvider']; gpsUrl: string; gpsKey?: string; autoTrips: boolean };
export interface GpsTest {
  positions: number;
  vehicles: { name: string; number: string; deviceId: string; found: boolean; lat: number | null; lng: number | null; speed: number | null; at: string | null }[];
}
export interface MapTiles {
  provider: 'osm' | 'google';
  url: string;
  attribution: string;
  maxZoom: number;
  note?: string;
}

export interface Driving {
  pingSeconds: number;
  routes: { id: string; name: string; morningStart: string; afternoonStart: string; trips: { id: string; kind: TripKind; status: string; startedAt: string; endedAt: string | null }[] }[];
  running: string | null;
}

export interface TripRow {
  id: string;
  route: string;
  kind: TripKind;
  status: string;
  source: string;
  by: string | null;
  startedAt: string;
  endedAt: string | null;
  delayMin: number;
  stopsReached: number;
  boarded: number;
  sos: number;
  overspeed: number;
}

export interface MyBusChild {
  student: { id: string; name: string };
  transport: {
    route: string;
    vehicle: string;
    stop: { id: string; name: string; lat: number | null; lng: number | null; morningTime: string | null; afternoonTime: string | null } | null;
    way: Way;
    driver: { name: string; mobile: string | null } | null;
    helper: { name: string; mobile: string | null } | null;
    trip: { id: string; kind: TripKind; startedAt?: string; delayMin?: number; eta?: number | null; stopsBefore?: number | null; mark?: { kind: string; at: string } | null; ended?: boolean; endedAt?: string | null } | null;
    map: { color: string; last: TripView['last']; path: [number, number][]; stops: { id: string; name: string; lat: number | null; lng: number | null; passed: boolean }[]; school: LatLng } | null;
  } | null;
}

const clean = (q: Record<string, string | undefined>) => Object.fromEntries(Object.entries(q).filter(([, v]) => v));

export const transportApi = {
  vehicles: () => api.get<Vehicle[]>('/transport/vehicles'),
  saveVehicle: (id: string | null, input: VehicleInput) => (id ? api.put<Vehicle>(`/transport/vehicles/${id}`, input) : api.post<Vehicle>('/transport/vehicles', input)),
  deleteVehicle: (id: string) => api.delete(`/transport/vehicles/${id}`),
  papers: (vehicleId: string) => api.get<VehiclePaper[]>(`/transport/vehicles/${vehicleId}/documents`),
  savePaper: (vehicleId: string, id: string | null, input: PaperInput) => (id ? api.put(`/transport/documents/${id}`, input) : api.post(`/transport/vehicles/${vehicleId}/documents`, input)),
  deletePaper: (id: string) => api.delete(`/transport/documents/${id}`),
  uploadPaper: (file: File) => uploadFile<{ id: string; name: string }>('/transport/files', 'file', file),
  paperFilePath: (id: string) => `/transport/documents/${id}/file`,

  routes: () => api.get<{ school: LatLng; routes: Route[] }>('/transport/routes'),
  saveRoute: (id: string | null, input: RouteInput) => (id ? api.put<Route>(`/transport/routes/${id}`, input) : api.post<Route>('/transport/routes', input)),
  deleteRoute: (id: string) => api.delete(`/transport/routes/${id}`),
  addStop: (routeId: string, input: StopInput) => api.post<Stop>(`/transport/routes/${routeId}/stops`, input),
  updateStop: (id: string, input: StopInput) => api.put<Stop>(`/transport/stops/${id}`, input),
  deleteStop: (id: string) => api.delete(`/transport/stops/${id}`),
  moveStop: (id: string, move: Move) => api.post(`/transport/stops/${id}/move`, moveBody(move)),
  staff: () => api.get<{ id: string; label: string; hasLogin: boolean }[]>('/transport/staff'),

  students: (q: { route?: string; search?: string; show?: string }) => api.get<{ rows: StudentRow[] }>('/transport/students', { params: clean(q) }),
  assign: (input: { studentIds: string[]; routeId: string; stopId: string; way: Way; fromDate: string; fare: number | null }) => api.post<{ assigned: number }>('/transport/students/assign', input),
  end: (input: { studentIds: string[]; lastDate: string }) => api.post<{ ended: number }>('/transport/students/end', input),

  live: () => api.get<Live>('/transport/live', { quiet: true }),
  trips: (q: { date?: string; route?: string }) => api.get<TripRow[]>('/transport/trips', { params: clean(q) }),
  trip: (id: string, quiet = false) => api.get<TripView>(`/transport/trips/${id}`, { quiet }),
  simulate: (routeId: string, kind: 'morning' | 'afternoon') => api.post<TripView>('/transport/simulate', { routeId, kind }),
  endTrip: (id: string) => api.post<TripView>(`/transport/trips/${id}/end`),

  driving: () => api.get<Driving>('/transport/drive'),
  start: (routeId: string, kind: TripKind) => api.post<TripView>('/transport/trips', { routeId, kind }),
  ping: (id: string, p: { lat: number; lng: number; speed: number | null; accuracy: number | null }) => api.postRead<{ nextStop: number; delayMin: number }>(`/transport/trips/${id}/ping`, p, { quiet: true }),
  board: (id: string, studentId: string, kind: 'boarded' | 'dropped' | 'absent') => api.post<TripView>(`/transport/trips/${id}/board`, { studentId, kind }),
  sos: (id: string, note: string) => api.post(`/transport/trips/${id}/sos`, { note: note || undefined }),

  connect: () => api.get<Connect>('/transport/connect'),
  saveConnect: (input: ConnectInput) => api.put<Connect>('/transport/connect', input),
  testGps: () => api.postRead<GpsTest>('/transport/connect/test'),
  map: () => api.get<MapTiles>('/transport/map', { quiet: true }),

  myBus: () => api.get<{ pingSeconds: number; children: MyBusChild[] }>('/transport/my-bus', { quiet: true }),
};

export const WAY_LABEL: Record<Way, string> = { both: 'Both ways', pickup: 'Morning only', drop: 'Afternoon only' };
export const KIND_LABEL: Record<TripKind, string> = { morning: 'Morning (to school)', afternoon: 'Afternoon (home)', special: 'Special trip' };
export const timeOf = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }) : '');
export const todayIST = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
