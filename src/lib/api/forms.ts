import { api } from './client';

/** Setup → Form Builder (cmsbackend/src/modules/forms). */

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'master' | 'phone' | 'email';

export interface CustomField {
  key: string;
  label: string;
  type: FieldType;
  options: string[];
  master: string | null;
  required: boolean;
  help: string | null;
  section: string | null;
  active: boolean;
}

/** What a form needs from the builder: the school's names for built-in fields and its extra fields. */
export interface FormExtras {
  labels: Record<string, string>;
  custom: CustomField[];
}

export type CustomValues = Record<string, unknown>;

export interface BuiltInField {
  key: string;
  defaultLabel: string;
  label: string;
  locked: boolean;
  fixedRequired: boolean;
  requireOnly: boolean;
  hidden: boolean;
  required: boolean;
}
export interface FormSetup {
  key: 'student' | 'staff';
  label: string;
  builtIn: BuiltInField[];
  custom: (CustomField & { used: number })[];
}

export const formsApi = {
  list: () => api.get<{ key: string; label: string }[]>('/forms'),
  get: (key: string) => api.get<FormSetup>(`/forms/${key}`),
  save: (key: string, input: { builtIn: { key: string; label: string | null; hidden: boolean; required: boolean }[]; custom: CustomField[] }) => api.put<FormSetup>(`/forms/${key}`, input),
};

export const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'select', label: 'One choice (dropdown)' },
  { value: 'multiselect', label: 'Several choices' },
  { value: 'master', label: 'A Masters list' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
];

/** The school's name for a built-in field, else the default. */
export const labelOf = (extras: Partial<FormExtras> | undefined, key: string, fallback: string) => extras?.labels?.[key] ?? fallback;
