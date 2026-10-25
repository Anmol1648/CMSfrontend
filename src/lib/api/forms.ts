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
  /** Only these roles see and fill it (empty = everyone who sees the record). */
  visibleTo: string[];
  /** Admission enquiry: also on the online form parents fill. */
  onPublicForm?: boolean;
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
  key: string;
  label: string;
  note: string | null;
  publicForm: boolean;
  builtIn: BuiltInField[];
  custom: (CustomField & { used: number })[];
  roles: { id: string; name: string }[];
}

export const formsApi = {
  list: () => api.get<{ key: string; label: string }[]>('/forms'),
  get: (key: string) => api.get<FormSetup>(`/forms/${key}`),
  /** A form's extra fields for the signed-in person (only those they may see). */
  extras: (key: string) => api.get<FormExtras>(`/forms/${key}/extras`),
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
