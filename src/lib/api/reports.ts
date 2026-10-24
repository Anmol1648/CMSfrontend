import { api, fetchFile } from './client';

/** Report Center (cmsbackend/src/modules/reports): the report library, files (Jasper / built-in) and designs. */

export type ReportFilterType = 'date' | 'year' | 'class' | 'section' | 'select' | 'text' | 'master' | 'exam' | 'ptm';
export type ReportColumnType = 'text' | 'number' | 'money' | 'date';
export type ReportFormat = 'pdf' | 'xlsx' | 'docx';
export type ReportEngine = 'auto' | 'jasper' | 'builtin';

export interface ReportListItem {
  key: string;
  custom: boolean;
  category: string;
  label: string;
  description: string;
  engine: 'jasper' | 'builtin';
  customVersion: number | null;
}

export interface ReportFilter {
  key: string;
  label: string;
  type: ReportFilterType;
  /** master: the list whose options are offered (by code). */
  master?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  help?: string;
  /** The default, already worked out (today, the current session…). */
  value: string;
}

export interface ReportColumn {
  key: string;
  label: string;
  type: ReportColumnType;
  width?: number;
  total?: boolean;
}

export interface ReportInfo {
  key: string;
  category: string;
  label: string;
  description: string;
  orientation: 'portrait' | 'landscape';
  filters: ReportFilter[];
  columns: ReportColumn[];
  /** How its files are made for this school. */
  engine: string;
  canDesign: boolean;
  canBuild: boolean;
  /** Set when it was made in the Report Builder. */
  customId: string | null;
  hasBuiltInDesign: boolean;
}

export type ReportRow = Record<string, string | number | null> & { groupKey?: string; groupLabel?: string | null };

export interface ReportRun {
  subtitle: string;
  groupedBy: string | null;
  columns: ReportColumn[];
  rows: ReportRow[];
  count: number;
  truncated: boolean;
  totals: Record<string, number>;
}

export interface DesignVersion {
  id: string;
  version: number;
  fileName: string;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  uploadedBy: string | null;
}

export interface ReportDesigns {
  engine: ReportEngine;
  hasBuiltInDesign: boolean;
  service: { running: boolean; version?: string };
  versions: DesignVersion[];
  fields: { name: string; label: string; type: string }[];
  parameters: { name: string; type: string; description: string }[];
}

const base = (key: string) => `/reports/${encodeURIComponent(key)}`;

export const reportsApi = {
  list: () => api.get<{ canDesign: boolean; canBuild: boolean; reports: ReportListItem[] }>('/reports'),
  get: (key: string) => api.get<ReportInfo>(base(key)),
  run: (key: string, filters: Record<string, string>) => api.get<ReportRun>(`${base(key)}/run`, { params: filters, timeout: 180_000 }),
  file: (key: string, filters: Record<string, string>, format: ReportFormat) => fetchFile(`${base(key)}/file`, { ...filters, format }),

  designs: (key: string) => api.get<ReportDesigns>(`${base(key)}/designs`),
  upload: (key: string, jrxml: string, fileName: string, note?: string) =>
    api.post<{ id: string; version: number; warnings: string[] }>(`${base(key)}/designs`, jrxml, { headers: { 'Content-Type': 'application/xml' }, params: { fileName, ...(note ? { note } : {}) }, timeout: 90_000 }),
  activate: (key: string, id: string) => api.post<ReportDesigns>(`${base(key)}/designs/${id}/activate`),
  reset: (key: string) => api.post<ReportDesigns>(`${base(key)}/designs/reset`),
  remove: (key: string, id: string) => api.delete<ReportDesigns>(`${base(key)}/designs/${id}`),
  setEngine: (key: string, engine: ReportEngine) => api.put<ReportDesigns>(`${base(key)}/engine`, { engine }),
  /** id = a version's id, or 'builtin'. */
  downloadDesign: (key: string, id: string) => fetchFile(`${base(key)}/designs/${id}/download`),
  preview: (key: string, id: string, filters: Record<string, string>, format: ReportFormat = 'pdf') => fetchFile(`${base(key)}/designs/${id}/preview`, { ...filters, format }),
  sample: (key: string, filters: Record<string, string>) => fetchFile(`${base(key)}/sample`, filters),
};

// ─── Report Builder ──────────────────────────────────────────────────────────

export type DataFieldType = 'text' | 'number' | 'money' | 'date' | 'boolean';
export type FilterOp = 'eq' | 'neq' | 'contains' | 'notContains' | 'starts' | 'in' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'empty' | 'notEmpty' | 'yes' | 'no';

export interface DataField {
  key: string;
  label: string;
  type: DataFieldType;
  group?: string;
  sensitive?: boolean;
  /** The conditions it can be filtered with (none for sensitive fields). */
  ops: FilterOp[];
}

export interface DataSource {
  key: string;
  label: string;
  description: string;
  category: string;
  /** Asked before the rows load (session, period), with their defaults. */
  params: (Omit<ReportFilter, 'value'> & { default?: string })[];
  fields: DataField[];
}

export interface Definition {
  source: string;
  params: Record<string, string>;
  columns: { field: string; label?: string }[];
  filters: { field: string; op: FilterOp; value: string; value2: string; ask: boolean; label?: string }[];
  sort: { field: string; dir: 'asc' | 'desc' }[];
  groupBy: string | null;
  totals: string[];
  orientation: 'portrait' | 'landscape';
}

export interface CustomReport {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  roleIds: string[];
  definition: Definition;
  updatedAt: string;
}

export type CustomReportInput = Omit<CustomReport, 'id' | 'key' | 'updatedAt'>;

export interface BuilderPreview extends ReportRun {
  asks: { key: string; label: string; type: string }[];
}

export const builderApi = {
  sources: () => api.get<DataSource[]>('/reports/builder/sources'),
  roles: () => api.get<{ id: string; name: string }[]>('/reports/builder/roles'),
  preview: (definition: Definition) => api.postRead<BuilderPreview>('/reports/builder/preview', { definition }, { timeout: 180_000, quiet: true }),
  get: (id: string) => api.get<CustomReport>(`/reports/builder/reports/${id}`),
  create: (input: CustomReportInput) => api.post<CustomReport>('/reports/builder/reports', input),
  update: (id: string, input: CustomReportInput) => api.put<CustomReport>(`/reports/builder/reports/${id}`, input),
  remove: (id: string) => api.delete<null>(`/reports/builder/reports/${id}`),
  /** A Jasper design made from the report's columns. */
  generatedDesign: (key: string) => fetchFile(`/reports/${encodeURIComponent(key)}/designs/generated/download`),
};
