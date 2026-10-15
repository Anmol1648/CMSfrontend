import { api, downloadFile, uploadFile } from './client';

/** Excel imports (cmsbackend/src/modules/imports): template → check → import good rows → report. */

export interface ImportJob {
  id: string;
  kind: string;
  status: 'validated' | 'importing' | 'done' | 'failed';
  fileName: string | null;
  totalRows: number;
  validRows: number;
  importedRows: number;
  problemCount: number;
  createdAt: string;
  finishedAt: string | null;
  byMe: boolean;
}

export interface CheckedRow {
  row: number;
  ok: boolean;
  values: Record<string, string | number | null>;
  issues: { field: string; message: string }[];
}

export interface CheckResult {
  job: ImportJob;
  problems: string[];
  rows: CheckedRow[];
  columns: { key: string; header: string }[];
}

export interface RunResult {
  job: ImportJob;
  problems: string[];
  results: { row: number; values: Record<string, string> }[];
}

export const importsApi = {
  template: (kind: string) => downloadFile(`/imports/${kind}/template`, undefined, `${kind}-import-template.xlsx`),
  check: (kind: string, file: File) => uploadFile<CheckResult>(`/imports/${kind}/check`, 'file', file),
  run: (jobId: string) => api.post<RunResult>(`/imports/jobs/${jobId}/run`),
  problems: (jobId: string) => downloadFile(`/imports/jobs/${jobId}/problems`, undefined, 'import-problems.xlsx'),
  recent: (kind: string) => api.get<ImportJob[]>('/imports/jobs', { params: { kind } }),
};
