import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ActionLog } from '../../lib/db';

interface FrequencyChartProps {
    logs: ActionLog[];
}

export function FrequencyChart({ logs }: FrequencyChartProps) {
    const dataMap = logs.reduce((acc, log) => {
        acc[log.actionName] = (acc[log.actionName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const data = Object.entries(dataMap).map(([name, count]) => ({
        name,
        count,
    }));

    data.sort((a, b) => b.count - a.count);

    return (
        <div className="w-full h-64 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">행동 빈도</h3>
            {data.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400">
                    아직 기록된 데이터가 없습니다
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                        <YAxis allowDecimals={false} />
                        <Tooltip
                            cursor={{ fill: '#f1f5f9' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#60a5fa'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
