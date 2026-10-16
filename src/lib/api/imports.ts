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

export interface ImportColumnInfo {
  key: string;
  header: string;
  type: 'text' | 'email' | 'mobile' | 'number' | 'date' | 'choice' | 'list';
  required: boolean;
  help: string | null;
  example: string | null;
  max: number | null;
  choices: { value: string; help: string | null }[] | null;
}

export const importsApi = {
  columns: (kind: string) => api.get<ImportColumnInfo[]>(`/imports/${kind}/columns`),
  template: (kind: string) => downloadFile(`/imports/${kind}/template`, undefined, `${kind}-import-template.xlsx`),
  check: (kind: string, file: File) => uploadFile<CheckResult>(`/imports/${kind}/check`, 'file', file),
  // Each row is a new account (password hashing, checks), so a big file takes a while.
  run: (jobId: string) => api.post<RunResult>(`/imports/jobs/${jobId}/run`, undefined, { timeout: 15 * 60_000 }),
  problems: (jobId: string) => downloadFile(`/imports/jobs/${jobId}/problems`, undefined, 'import-problems.xlsx'),
  recent: (kind: string) => api.get<ImportJob[]>('/imports/jobs', { params: { kind } }),
};
