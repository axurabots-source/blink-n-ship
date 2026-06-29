'use client';

import { motion } from 'framer-motion';
import {
    ShoppingBag,
    CheckCircle,
    Boxes,
    TrendingUp,
    DollarSign,
    PackageCheck,
} from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

type GraphDataPoint = {
    dateStr: string;
    profit: number;
    revenue: number;
};

type TodayOrder = {
    id: string;
    customerName: string | null;
    city: string | null;
    productName: string;
    trackingNumber: string | null;
    profit: number;
};

const T = {
    bg: '#ffffff',
    fg: '#0a0a0a',
    accent: '#CC785C',
    accentHover: '#b8694e',
    accentLight: '#fff5f0',
    border: '#e5e5e5',
    muted: '#737373',
    card: '#fafafa',
};

const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.42, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
    }),
};

// Custom recharts tooltip matching minimalist design
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: '#ffffff',
                border: `1px solid ${T.border}`,
                borderRadius: '8px',
                padding: '10px 14px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                fontSize: '0.8rem',
            }}>
                <p style={{ margin: '0 0 6px', fontWeight: 600, color: T.fg }}>{payload[0].payload.dateStr}</p>
                <p style={{ margin: '0 0 4px', color: T.accent, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span>Profit:</span>
                    <strong>Rs {payload[0].value.toLocaleString('en-PK')}</strong>
                </p>
                <p style={{ margin: 0, color: '#939393', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span>Revenue:</span>
                    <strong>Rs {payload[1].value.toLocaleString('en-PK')}</strong>
                </p>
            </div>
        );
    }
    return null;
};

export default function DashboardClient({
    businessName,
    accountType,
    stats,
    graphData,
    todayOrders,
}: {
    businessName: string | null;
    accountType: string | null;
    stats: {
        totalOrders: number;
        bookedToday: number;
        totalRevenue: number;
        totalProfit: number;
    };
    graphData: GraphDataPoint[];
    todayOrders: TodayOrder[];
}) {
    const accountLabel = accountType === 'inventory_holder' ? 'Inventory Holder' : 'Reseller';

    const statList = [
        { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag },
        { label: 'Booked Today', value: stats.bookedToday, icon: PackageCheck },
        { label: 'Total Revenue', value: `Rs ${stats.totalRevenue.toLocaleString('en-PK')}`, icon: DollarSign, color: '#0a0a0a' },
        { label: 'Total Profit', value: `Rs ${stats.totalProfit.toLocaleString('en-PK')}`, icon: TrendingUp, color: '#16a34a' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{
                minHeight: '100vh',
                background: '#ffffff',
                padding: '40px 48px',
                fontFamily: 'var(--font-geist-sans), sans-serif',
                boxSizing: 'border-box',
            }}
            className="bns-page"
        >
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{ marginBottom: 40 }}
                className="bns-header"
            >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0a0a0a', margin: 0 }}>
                        {businessName ? `${businessName}` : 'Dashboard'}
                    </h1>
                    <span
                        style={{
                            fontSize: '0.75rem',
                            color: T.accent,
                            fontWeight: 600,
                            background: '#fff5f0',
                            border: '1px solid #f0d4c8',
                            padding: '2px 10px',
                            borderRadius: 20,
                        }}
                    >
                        {accountLabel}
                    </span>
                </div>
                <p style={{ color: '#737373', fontSize: '0.875rem', margin: 0 }}>
                    Here's what's happening with your shipments today.
                </p>
            </motion.div>

            {/* Stat cards: 2x2 grid on desktop, 1col on mobile */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: 20,
                    marginBottom: 40,
                }}
                className="bns-stat-grid"
            >
                {statList.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            custom={i}
                            variants={fadeUp}
                            initial="hidden"
                            animate="show"
                            style={{
                                background: '#fafafa',
                                border: '1px solid #e5e5e5',
                                borderRadius: 12,
                                padding: '24px 24px 20px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <p style={{ fontSize: '0.8rem', color: '#737373', margin: 0, fontWeight: 500 }}>
                                    {stat.label}
                                </p>
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        background: '#fff5f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Icon size={15} color="#CC785C" strokeWidth={2} />
                                </div>
                            </div>
                            <p
                                style={{
                                    fontSize: '1.75rem',
                                    fontWeight: 700,
                                    color: (stat as any).color || '#0a0a0a',
                                    margin: '12px 0 0',
                                    lineHeight: 1.1,
                                }}
                            >
                                {stat.value}
                            </p>
                        </motion.div>
                    );
                })}
            </div>

            {/* 14-Day Motion Graph */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    padding: '24px 24px 20px',
                    marginBottom: 40,
                }}
            >
                <div style={{ marginBottom: 20 }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, color: T.fg, margin: 0 }}>
                        14-Day Profit & Revenue
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: T.muted, margin: '2px 0 0' }}>
                        Visualizing financial performance trends
                    </p>
                </div>
                <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={graphData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                            <XAxis
                                dataKey="dateStr"
                                stroke="#d4d4d4"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#d4d4d4"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `Rs ${v}`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="profit"
                                stroke={T.accent}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 0, fill: T.accent }}
                            />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#e5e5e5"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 0, fill: '#cccccc' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Today's Booked Orders */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
                <div style={{ marginBottom: 16 }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0a0a0a', margin: 0 }}>
                        Today's Booked Shipments
                    </h2>
                </div>

                <div
                    style={{
                        background: '#ffffff',
                        border: '1px solid #e5e5e5',
                        borderRadius: 12,
                        overflow: 'hidden',
                    }}
                >
                    {todayOrders.length === 0 ? (
                        <div
                            style={{
                                padding: '48px 24px',
                                textAlign: 'center',
                                color: '#737373',
                                fontSize: '0.875rem',
                            }}
                        >
                            No orders booked today. Head to{' '}
                            <Link href="/orders" style={{ color: '#CC785C', fontWeight: 500, textDecoration: 'none' }}>
                                Booking
                            </Link>{' '}
                            to process shipments.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                                <thead>
                                    <tr
                                        style={{
                                            borderBottom: '1px solid #e5e5e5',
                                            background: '#fafafa',
                                        }}
                                    >
                                        {['Customer', 'City', 'Product', 'Tracking', 'Profit'].map((h) => (
                                            <th
                                                key={h}
                                                style={{
                                                    padding: '10px 16px',
                                                    textAlign: 'left',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 600,
                                                    color: '#737373',
                                                    letterSpacing: '0.05em',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {todayOrders.map((o, i) => (
                                        <motion.tr
                                            key={o.id}
                                            custom={i}
                                            variants={fadeUp}
                                            initial="hidden"
                                            animate="show"
                                            style={{
                                                borderBottom: i < todayOrders.length - 1 ? '1px solid #f0f0f0' : 'none',
                                            }}
                                        >
                                            <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500, color: '#0a0a0a' }}>
                                                {o.customerName || '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#737373' }}>
                                                {o.city || '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: T.fg }}>
                                                {o.productName}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#737373', fontFamily: 'var(--font-geist-mono)' }}>
                                                {o.trackingNumber || '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 600, color: o.profit > 0 ? '#16a34a' : '#0a0a0a' }}>
                                                Rs {o.profit.toLocaleString('en-PK')}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
