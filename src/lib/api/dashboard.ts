import { api } from './client';

/** The home dashboard (cmsbackend/src/modules/dashboard): widgets per role, each with its own data. */

export type WidgetSize = 'sm' | 'md' | 'lg';
export type WidgetType = 'stat' | 'chart' | 'donut' | 'list';
export type Tone = 'good' | 'warn' | 'bad' | 'neutral';

export interface DashboardWidget {
  key: string;
  label: string;
  type: WidgetType;
  size: WidgetSize;
  href: string | null;
}

export interface StatData {
  value: string | number;
  caption?: string;
  tone?: Tone;
  progress?: { value: number; max: number; label?: string };
  sub?: { label: string; value: string | number; tone?: Tone }[];
  action?: { label: string; href: string };
}
export interface ChartData {
  kind: 'bar' | 'line';
  points: { label: string; value: number; hint?: string }[];
  money?: boolean;
  caption?: string;
}
export interface DonutData {
  slices: { label: string; value: number }[];
  money?: boolean;
  centerLabel?: string;
}
export interface ListData {
  items: { title: string; sub?: string; meta?: string; href?: string; tone?: Tone; badge?: string | number }[];
  empty: string;
  more?: { label: string; href: string };
}
export type WidgetData = Partial<StatData & ChartData & DonutData & ListData> & { hidden?: boolean; note?: string; updatedAt: string };

export interface CatalogueWidget {
  key: string;
  label: string;
  description: string;
  category: string;
  type: WidgetType;
  size: WidgetSize;
  permissions: string[];
  href: string | null;
}
export interface RoleLayout {
  role: { id: string; name: string; slug: string };
  customised: boolean;
  updatedAt: string | null;
  widgets: { key: string; size: WidgetSize; label: string; category: string; type: WidgetType; hiddenFor: string | null }[];
}

export const dashboardApi = {
  mine: () => api.get<{ widgets: DashboardWidget[]; canSetUp: boolean }>('/dashboard'),
  widget: (key: string, fresh = false) => api.get<WidgetData>(`/dashboard/widgets/${key}`, { params: fresh ? { fresh: '1' } : {}, quiet: true }),
  catalogue: () => api.get<CatalogueWidget[]>('/dashboard/setup/catalogue'),
  roles: () => api.get<{ id: string; name: string; slug: string; customised: boolean; hasDefault: boolean }[]>('/dashboard/setup/roles'),
  layout: (roleId: string) => api.get<RoleLayout>(`/dashboard/setup/roles/${roleId}`),
  save: (roleId: string, widgets: { key: string; size: WidgetSize }[]) => api.put<RoleLayout>(`/dashboard/setup/roles/${roleId}`, { widgets }),
  reset: (roleId: string) => api.delete<RoleLayout>(`/dashboard/setup/roles/${roleId}`),
};

export const SIZE_LABEL: Record<WidgetSize, string> = { sm: 'Small', md: 'Medium (2 columns)', lg: 'Wide (full row)' };
