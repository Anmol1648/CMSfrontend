import { api, uploadFile } from './client';

/** Shared files / Downloads (cmsbackend/src/modules/uploads, served at /api/shared). */

export type Audience = 'everyone' | 'staff' | 'custom';
export interface Rule {
  inherit: boolean;
  audience: Audience;
  roleSlugs: string[];
  sectionIds: string[];
  userIds: string[];
  withParents: boolean;
}
export interface Folder extends Rule {
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  staffAdd: boolean;
  sortOrder: number;
  who: string;
  files: number;
  pending: number;
}
export interface Item extends Rule {
  id: string;
  title: string;
  description: string | null;
  kind: 'file' | 'link';
  link: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  version: number;
  tags: string[];
  tagIds: string[];
  who: string;
  validUntil: string | null;
  expired: boolean;
  needsAck: boolean;
  acks: number;
  opened: number;
  status: 'published' | 'pending';
  uploadedBy: string | null;
  mine: boolean;
  createdAt: string;
  canEdit: boolean;
}
export interface Tracking {
  title: string;
  version: number;
  needsAck: boolean;
  audience: number;
  opened: number;
  acknowledged: number;
  views: { name: string; kind: string; opens: number; lastAt: string; acknowledgedAt: string | null }[];
  notYet: { name: string; kind: string }[];
  versions: { version: number; fileName: string | null; link: string | null; at: string }[];
}
export interface DownloadItem {
  id: string;
  title: string;
  description: string | null;
  kind: 'file' | 'link';
  link: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  version: number;
  tags: string[];
  validUntil: string | null;
  isNew: boolean;
  needsAck: boolean;
  acknowledged: boolean;
  updatedAt: string;
}

export type ItemInput = Rule & { folderId: string; title: string; description: string | null; tagIds: string[]; kind: 'file' | 'link'; fileId: string | null; link: string | null; validUntil: string | null; needsAck: boolean; notify: boolean };

export const sharedApi = {
  library: () => api.get<{ folders: Folder[]; roles: { slug: string; name: string }[]; manage: boolean; mySections: string[] }>('/shared/library'),
  saveFolder: (id: string | null, input: Rule & { parentId: string | null; name: string; description: string | null; staffAdd: boolean; sortOrder: number }) => (id ? api.put<{ id: string }>(`/shared/folders/${id}`, input) : api.post<{ id: string }>('/shared/folders', input)),
  deleteFolder: (id: string) => api.delete(`/shared/folders/${id}`),
  items: (folderId: string) => api.get<Item[]>(`/shared/folders/${folderId}/items`),
  upload: (file: File) => uploadFile<{ id: string; name: string; mimeType: string; sizeBytes: number }>('/shared/files', 'file', file),
  addItem: (input: ItemInput) => api.post<{ id: string; status: string }>('/shared/items', input),
  editItem: (id: string, input: Rule & { folderId: string; title: string; description: string | null; tagIds: string[]; validUntil: string | null; needsAck: boolean }) => api.put(`/shared/items/${id}`, input),
  newVersion: (id: string, input: { fileId?: string | null; link?: string | null; notify: boolean }) => api.post<{ version: number }>(`/shared/items/${id}/version`, input),
  deleteItem: (id: string) => api.delete(`/shared/items/${id}`),
  approve: (id: string, approve: boolean) => api.post(`/shared/items/${id}/approve`, { approve }),
  tracking: (id: string) => api.get<Tracking>(`/shared/items/${id}/tracking`),
  filePath: (id: string) => `/shared/items/${id}/file`,
  versionPath: (id: string, version: number) => `/shared/items/${id}/versions/${version}/file`,
  downloads: (search?: string) => api.get<{ folders: { id: string; parentId: string | null; name: string; description: string | null; items: DownloadItem[] }[]; toAcknowledge: number }>('/shared/downloads', { params: search ? { search } : {} }),
  ack: (id: string) => api.post(`/shared/items/${id}/ack`),
};

export const fileIcon = (mime: string | null, kind: string) => (kind === 'link' ? 'link' : !mime ? 'draft' : mime.includes('pdf') ? 'picture_as_pdf' : mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'movie' : mime.includes('word') ? 'description' : mime.includes('sheet') ? 'table_chart' : mime.includes('presentation') ? 'slideshow' : 'draft');
export const size = (b: number | null) => (!b ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
