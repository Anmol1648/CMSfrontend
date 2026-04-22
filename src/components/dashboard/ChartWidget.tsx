import React, { useEffect } from 'react';
import { useExecuteWidget } from '@/lib/hooks/useDashboard';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DashboardWidget } from '@/types/models/widget.model';

interface ChartWidgetProps {
    widget: DashboardWidget;
}

export const ChartWidget = ({ widget }: ChartWidgetProps) => {
    const { mutate: execute, data: result, isPending, isError } = useExecuteWidget();

    useEffect(() => {
        execute({ query: widget.query });
    }, [widget.query, execute]);

    if (isPending) {
        return <div className="h-full min-h-[300px] bg-surface-container-low animate-pulse rounded-2xl"></div>;
    }

    if (isError || !result || !result.rows) {
        return (
            <div className="h-full min-h-[300px] flex items-center justify-center bg-surface-container-low rounded-2xl text-on-surface-variant">
                <span className="material-symbols-outlined mr-2">error</span>
                Error loading chart
            </div>
        );
    }

    const { sub_type, config, title } = widget;
    const colors = config?.colors || ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const data = result.rows;

    const renderChart = () => {
        if (sub_type === 'bar') {
            const xKey = config?.xKey || 'label';
            const yKey = config?.yKey || 'value';
            return (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey={yKey} fill={colors[0]} radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                </ResponsiveContainer>
            );
        }

        if (sub_type === 'line') {
            const xKey = config?.xKey || 'label';
            const yKey = config?.yKey || 'value';
            return (
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Line type={config?.smooth ? "monotone" : "linear"} dataKey={yKey} stroke={colors[0]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            );
        }

        if (sub_type === 'pie' || sub_type === 'donut') {
            const nameKey = config?.nameKey || 'label';
            const valueKey = config?.valueKey || 'value';
            const innerRadius = sub_type === 'donut' ? (config?.innerRadius || 60) : 0;
            return (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={innerRadius}
                            outerRadius={100}
                            paddingAngle={sub_type === 'donut' ? 4 : 0}
                            dataKey={valueKey}
                            nameKey={nameKey}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                </ResponsiveContainer>
            );
        }

        return <div className="text-center p-4">Unsupported chart type: {sub_type}</div>;
    };

    return (
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm h-full flex flex-col">
            <h3 className="text-sm font-bold tracking-tight text-primary mb-4 flex items-center gap-2">
                {widget.customization?.icon && (
                    <span className="material-symbols-outlined text-sm">{widget.customization.icon}</span>
                )}
                {widget.display_name || title}
            </h3>
            <div className="flex-1 min-h-[300px] flex items-center justify-center">
                {renderChart()}
            </div>
        </div>
    );
};
