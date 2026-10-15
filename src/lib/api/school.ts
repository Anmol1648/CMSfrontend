import { api, API_BASE_URL, uploadFile } from './client';

/** Calls to /api/school-profile and /api/public/school. */

export interface SchoolProfile {
  tenantId: string;
  legalName: string;
  shortName: string | null;
  logoFileId: string | null;
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
  loginBackgroundFileId: string | null;
  loginBackgroundFocus: LoginFocus;
  loginOverlay: number;
  loginQuote: string | null;
  loginQuoteAuthor: string | null;
  updatedAt: string;
  tenant: { code: string; name: string; status: string };
}

export type SchoolProfileUpdate = Partial<Omit<SchoolProfile, 'tenantId' | 'tenant' | 'updatedAt' | 'logoFileId' | 'loginBackgroundFileId'>> & { updatedAt?: string };

export interface PublicSchool {
  code: string;
  name: string;
  legalName: string;
  logoUrl: string | null;
  dateFormat: string;
  timeZone: string;
  login: LoginBranding;
}

export type LoginFocus = 'center' | 'top' | 'bottom' | 'left' | 'right';

/** How the sign-in page's left panel looks. */
export interface LoginBranding {
  backgroundUrl: string | null;
  backgroundFocus: LoginFocus;
  overlay: number;
  quote: string | null;
  quoteAuthor: string | null;
}

export type SchoolImage = 'logo' | 'login-background';

export const schoolApi = {
  publicInfo: () => api.get<PublicSchool>('/public/school'),
  profile: () => api.get<SchoolProfile>('/school-profile'),
  updateProfile: (changes: SchoolProfileUpdate) => api.patch<SchoolProfile>('/school-profile', changes),
  uploadImage: (slot: SchoolImage, file: File) => uploadFile<SchoolProfile>(`/school-profile/${slot}`, 'image', file),
  removeImage: (slot: SchoolImage) => api.delete<SchoolProfile>(`/school-profile/${slot}`),
};

// The sign-in page's school name and logo are public; remembering them in this browser lets the
// page show them at once instead of after the first request.
const BRANDING_KEY = "school-branding";

export const readCachedBranding = (): PublicSchool | undefined => {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(BRANDING_KEY) : null;
    return raw ? (JSON.parse(raw) as PublicSchool) : undefined;
  } catch {
    return undefined;
  }
};

export const saveCachedBranding = (b: PublicSchool) => {
  try {
    window.localStorage.setItem(BRANDING_KEY, JSON.stringify(b));
  } catch {
    // private mode / storage blocked: just don't remember it
  }
};

/** Full address of a logo path returned by the API (relative to the API base). */
export const logoSrc = (relative: string | null | undefined) => (relative ? `${API_BASE_URL}/${relative}` : null);
