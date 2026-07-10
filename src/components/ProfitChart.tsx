'use client';

import dynamic from 'next/dynamic';

const RechartsChart = dynamic(
    () => import('./ProfitChartInner'),
    { ssr: false, loading: () => <ChartSkeleton /> }
);

function ChartSkeleton() {
    return (
        <div style={{
            height: '100%', width: '100%', minHeight: 180,
            background: '#fafafa', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#737373', fontSize: '0.8rem',
        }}>
            Loading chart...
        </div>
    );
}

export default function ProfitChart(props: {
    data: { dateStr: string; profit: number; revenue?: number }[];
    showRevenue?: boolean;
    height?: number;
}) {
    return <RechartsChart {...props} />;
}
