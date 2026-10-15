import { api } from './client';

/** Calls to /api/school-profile and /api/public/school. */

export interface SchoolProfile {
  tenantId: string;
  legalName: string;
  shortName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  board: string | null;
  affiliationNo: string | null;
  udiseCode: string | null;
  establishedYear: number | null;
  timeZone: string;
  dateFormat: string;
  currency: string;
  academicYearStartMonth: number;
  updatedAt: string;
  tenant: { code: string; name: string; status: string };
}

export type SchoolProfileUpdate = Partial<Omit<SchoolProfile, 'tenantId' | 'tenant' | 'updatedAt'>> & { updatedAt?: string };

export interface PublicSchool {
  code: string;
  name: string;
  legalName: string;
  logoUrl: string | null;
  dateFormat: string;
  timeZone: string;
}

export const schoolApi = {
  publicInfo: () => api.get<PublicSchool>('/public/school'),
  profile: () => api.get<SchoolProfile>('/school-profile'),
  updateProfile: (changes: SchoolProfileUpdate) => api.patch<SchoolProfile>('/school-profile', changes),
};
