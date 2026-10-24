import { api } from './client';
import type { WidgetData, WidgetSize, WidgetType } from './dashboard';

/** The Widget Builder (cmsbackend/src/modules/dashboard/custom-widgets.service.ts). */

export type FieldType = 'text' | 'number' | 'money' | 'date' | 'boolean';
export type Op = 'eq' | 'neq' | 'contains' | 'notContains' | 'starts' | 'in' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'empty' | 'notEmpty' | 'yes' | 'no';
export interface SourceField {
  key: string;
  label: string;
  type: FieldType;
  group: string | null;
  sensitive: boolean;
  ops: Op[];
}
export interface SourceParam {
  key: string;
  label: string;
  type: 'date' | 'year' | 'class' | 'section' | 'select' | 'text' | 'master' | 'exam' | 'ptm';
  required?: boolean;
  default?: string;
  options?: { value: string; label: string }[];
}
export interface Source {
  key: string;
  label: string;
  description: string;
  category: string;
  params: SourceParam[];
  fields: SourceField[];
}
export type ShowAs = 'stat' | 'bar' | 'line' | 'donut' | 'list';
export type Fn = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
export interface Definition {
  source: string;
  params: Record<string, string>;
  filters: { field: string; op: Op; value: string; value2: string }[];
  display: {
    type: ShowAs;
    measure: { fn: Fn; field: string | null };
    groupBy: string | null;
    bucket: 'day' | 'week' | 'month' | null;
    sort: 'value_desc' | 'value_asc' | 'label_asc' | 'label_desc';
    limit: number;
    list: { title: string | null; sub: string | null; meta: string | null; sortBy: string | null; dir: 'asc' | 'desc' };
    tones: { warnAt: number | null; badAt: number | null; direction: 'above' | 'below' };
    caption: string;
  };
}
export interface CustomWidget {
  id: string;
  key: string;
  name: string;
  description: string;
  size: WidgetSize;
  roleIds: string[];
  href: string | null;
  isActive: boolean;
  definition: Definition;
  createdBy: string | null;
  updatedAt: string;
  source?: string;
  maker?: string;
}
export type CustomWidgetInput = Pick<CustomWidget, 'name' | 'description' | 'size' | 'roleIds' | 'href' | 'isActive' | 'definition'>;

export const widgetsApi = {
  sources: () => api.get<Source[]>('/dashboard/builder/sources'),
  roles: () => api.get<{ id: string; name: string }[]>('/dashboard/builder/roles'),
  preview: (definition: Definition) => api.postRead<WidgetData & { type: WidgetType }>('/dashboard/builder/preview', { definition }, { quiet: true }),
  list: () => api.get<CustomWidget[]>('/dashboard/builder/widgets'),
  get: (id: string) => api.get<CustomWidget>(`/dashboard/builder/widgets/${id}`),
  save: (id: string | null, b: CustomWidgetInput) => (id ? api.put<CustomWidget>(`/dashboard/builder/widgets/${id}`, b) : api.post<CustomWidget>('/dashboard/builder/widgets', b)),
  remove: (id: string) => api.delete(`/dashboard/builder/widgets/${id}`),
};

export const OP_LABEL: Record<Op, string> = { eq: 'is', neq: 'is not', contains: 'contains', notContains: 'does not contain', starts: 'starts with', in: 'is one of', gt: 'more than', gte: 'at least', lt: 'less than', lte: 'at most', between: 'between', empty: 'is empty', notEmpty: 'is not empty', yes: 'is yes', no: 'is no' };
export const FN_LABEL: Record<Fn, string> = { count: 'How many (count)', sum: 'Total of', avg: 'Average of', min: 'Lowest', max: 'Highest', distinct: 'How many different' };
export const SHOW_AS: { value: ShowAs; label: string; icon: string }[] = [
  { value: 'stat', label: 'Number', icon: 'looks_one' },
  { value: 'bar', label: 'Bar chart', icon: 'bar_chart' },
  { value: 'line', label: 'Line chart', icon: 'show_chart' },
  { value: 'donut', label: 'Donut', icon: 'donut_large' },
  { value: 'list', label: 'List', icon: 'list' },
];
/** Relative dates the server understands in conditions and inputs. */
export const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '-7d', label: '7 days ago' },
  { value: '-30d', label: '30 days ago' },
  { value: '-90d', label: '90 days ago' },
  { value: 'monthStart', label: 'Start of this month' },
  { value: 'lastMonthStart', label: 'Start of last month' },
  { value: 'sessionStart', label: 'Start of the session' },
  { value: 'yearStart', label: 'Start of the year' },
];
export const blankDefinition = (source = ''): Definition => ({
  source,
  params: {},
  filters: [],
  display: { type: 'stat', measure: { fn: 'count', field: null }, groupBy: null, bucket: null, sort: 'value_desc', limit: 10, list: { title: null, sub: null, meta: null, sortBy: null, dir: 'asc' }, tones: { warnAt: null, badAt: null, direction: 'above' }, caption: '' },
});
