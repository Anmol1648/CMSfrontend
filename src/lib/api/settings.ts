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

export const settingsApi = {
  list: () => api.get<SettingGroup[]>('/settings'),
  /** `null` resets a setting to its default. */
  save: (changes: Record<string, SettingValue | null>) => api.patch<SettingGroup[]>('/settings', { changes }),
};
