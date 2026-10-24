import { api } from './client';

/** System Settings (cmsbackend/src/modules/settings). */

export type SettingValue = boolean | number | string | string[];

export interface SettingItem {
  key: string;
  label: string;
  help: string | null;
  type: 'boolean' | 'number' | 'text' | 'select' | 'multiselect';
  options: { value: string; label: string }[] | null;
  default: SettingValue;
  value: SettingValue;
  isDefault: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  min?: number | null;
  max?: number | null;
}

export interface SettingGroup {
  group: string;
  settings: SettingItem[];
}

export interface MenuGroupSetup {
  key: string;
  defaultLabel: string;
  defaultOrder: number;
  label: string | null;
  sortOrder: number | null;
  hidden: boolean;
}
export interface MenuItemSetup {
  key: string;
  href: string;
  defaultLabel: string;
  defaultIcon: string;
  defaultGroup: string;
  defaultOrder: number;
  label: string | null;
  icon: string | null;
  groupKey: string | null;
  sortOrder: number | null;
  hidden: boolean;
  needs: string;
}
export type MenuPreview = { key: string; label: string; items: { key: string; label: string; icon: string; href: string }[] }[];
export interface MenuSetup {
  groups: MenuGroupSetup[];
  items: MenuItemSetup[];
  roles: { id: string; name: string }[];
}

export const menuApi = {
  get: () => api.get<MenuSetup>('/settings/menu'),
  save: (b: { groups: { key: string; label: string | null; sortOrder: number | null; hidden: boolean }[]; items: { key: string; label: string | null; icon: string | null; groupKey: string | null; sortOrder: number | null; hidden: boolean }[] }) => api.put<MenuSetup>('/settings/menu', b),
  reset: () => api.delete<MenuSetup>('/settings/menu'),
  preview: (roleId: string) => api.get<MenuPreview>(`/settings/menu/preview/${roleId}`),
};

export const settingsApi = {
  list: () => api.get<SettingGroup[]>('/settings'),
  /** `null` resets a setting to its default. */
  save: (changes: Record<string, SettingValue | null>) => api.patch<SettingGroup[]>('/settings', { changes }),
};
