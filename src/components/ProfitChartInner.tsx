'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export default function ProfitChartInner(props: {
    data: { dateStr: string; profit: number; revenue?: number }[];
    showRevenue?: boolean;
    height?: number;
}) {
    const { data, showRevenue, height = 220 } = props;
    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                    <XAxis
                        dataKey="dateStr"
                        stroke="#d4d4d4"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={8}
                    />
                    <YAxis
                        stroke="#d4d4d4"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => `Rs ${v}`}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e5e5', fontSize: '0.8rem' }}
                        labelStyle={{ fontWeight: 600 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="profit"
                        stroke="#CC785C"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0, fill: '#CC785C' }}
                    />
                    {showRevenue && (
                        <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#e5e5e5"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0, fill: '#cccccc' }}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
