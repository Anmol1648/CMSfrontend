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
  /** The person's saved choice on the widget's filter. */
  filter?: string | null;
}
export interface MyDashboard {
  widgets: DashboardWidget[];
  /** The person arranged it themselves. */
  personal: boolean;
  canCustomise: boolean;
  actionCentre: boolean;
  canSetUp: boolean;
}
export interface Action {
  key: string;
  label: string;
  icon: string;
  href: string;
  count: number;
  value: string;
  tone: 'warn' | 'bad';
}
export type Shortcut = { label: string; href: string };

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
export type WidgetData = Partial<StatData & ChartData & DonutData & ListData> & { hidden?: boolean; note?: string; filter?: { value: string; options: { value: string; label: string }[] }; updatedAt: string };

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
  mine: () => api.get<MyDashboard>('/dashboard'),
  widget: (key: string, fresh = false, filter?: string | null) => api.get<WidgetData>(`/dashboard/widgets/${key}`, { params: { ...(fresh ? { fresh: '1' } : {}), ...(filter ? { filter } : {}) }, quiet: true }),
  actions: (fresh = false) => api.get<Action[]>('/dashboard/actions', { params: fresh ? { fresh: '1' } : {}, quiet: true }),
  myCatalogue: () => api.get<CatalogueWidget[]>('/dashboard/mine/catalogue'),
  saveMine: (widgets: { key: string; size: WidgetSize; filter?: string | null }[]) => api.put<MyDashboard>('/dashboard/mine', { widgets }),
  resetMine: () => api.delete<MyDashboard>('/dashboard/mine'),
  links: () => api.get<Shortcut[]>('/dashboard/mine/links'),
  saveLinks: (links: Shortcut[]) => api.put<Shortcut[]>('/dashboard/mine/links', { links }),
  catalogue: () => api.get<CatalogueWidget[]>('/dashboard/setup/catalogue'),
  roles: () => api.get<{ id: string; name: string; slug: string; customised: boolean; hasDefault: boolean }[]>('/dashboard/setup/roles'),
  layout: (roleId: string) => api.get<RoleLayout>(`/dashboard/setup/roles/${roleId}`),
  save: (roleId: string, widgets: { key: string; size: WidgetSize }[]) => api.put<RoleLayout>(`/dashboard/setup/roles/${roleId}`, { widgets }),
  reset: (roleId: string) => api.delete<RoleLayout>(`/dashboard/setup/roles/${roleId}`),
};

export const SIZE_LABEL: Record<WidgetSize, string> = { sm: 'Small', md: 'Medium (2 columns)', lg: 'Wide (full row)' };
