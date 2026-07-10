'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/Toast';
import {
    TrendingUp,
    DollarSign,
    ChevronDown,
    ChevronUp,
    User,
    Package,
    Shield,
    ImageOff,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ProfitChart = dynamic(() => import('@/components/ProfitChart'), {
    ssr: false,
    loading: () => <div style={{ height: 280, background: '#fafafa', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#737373', fontSize: '0.8rem' }}>Loading chart...</div>,
});

type Order = {
    id: string;
    customerName: string | null;
    phoneNumber: string | null;
    address: string | null;
    city: string | null;
    productInfo: string | null;
    productId: string | null;
    quantity: number;
    costPrice: string | null;
    saleAmount: string | null;
    sellingPrice: string | null;
    profit: string | null;
    status: string;
    trackingNumber: string | null;
    weight: string | null;
    shippingType: string | null;
    createdAt: string;
    bookedAt: string | null;
    courierProvider: string | null;
    product?: {
        name: string;
        imageUrl: string | null;
    } | null;
};

type Product = {
    id: string;
    name: string;
    imageUrl: string | null;
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

export default function LedgerPage() {
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([refresh(), loadProducts()]);

        window.addEventListener('focus', refresh);
        const interval = setInterval(refresh, 30000);
        return () => {
            window.removeEventListener('focus', refresh);
            clearInterval(interval);
        };
    }, []);

    async function refresh() {
        try {
            const res = await fetch('/api/orders');
            if (res.ok) {
                const body = await res.json();
                setOrders(body.orders || []);
            }
        } catch (err) {
            console.error('Ledger refresh error:', err);
            toast('error', 'Failed to refresh ledger data');
        } finally {
            setLoading(false);
        }
    }

    async function loadProducts() {
        try {
            const res = await fetch('/api/products');
            if (res.ok) {
                const body = await res.json();
                setProducts(body.products || []);
            }
        } catch (err) {
            console.error('Products load error:', err);
        }
    }

    const bookedOrders = orders.filter((o) => o.status === 'booked');

    const totalRevenue = bookedOrders.reduce((sum, o) => sum + Number(o.saleAmount ?? 0), 0);
    const totalProfit = bookedOrders.reduce((sum, o) => sum + Number(o.profit ?? 0), 0);

    // Calculate 30-day profit graph data
    const getThirtyDaysGraphData = () => {
        const dailyMap = new Map<string, { dateStr: string; profit: number }>();
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
            dailyMap.set(key, { dateStr: key, profit: 0 });
        }

        for (const o of bookedOrders) {
            if (!o.bookedAt) continue;
            const key = new Date(o.bookedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
            const existing = dailyMap.get(key);
            if (existing) {
                existing.profit += Number(o.profit ?? 0);
            }
        }
        return Array.from(dailyMap.values());
    };

    const graphData = getThirtyDaysGraphData();

    function toggleRow(id: string) {
        setExpandedRow(expandedRow === id ? null : id);
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: '#ffffff',
                    border: `1px solid ${T.border}`,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    fontSize: '0.78rem',
                }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 600, color: T.fg }}>{payload[0].payload.dateStr}</p>
                    <p style={{ margin: 0, color: T.accent }}>
                        Profit: <strong>Rs {payload[0].value.toLocaleString('en-PK')}</strong>
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: T.bg, gap: 16 }}>
                <motion.div
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                    style={{
                        width: 44, height: 44, borderRadius: '50%',
                        border: `3px solid ${T.accentLight}`, borderTopColor: T.accent,
                        boxShadow: '0 0 16px rgba(204,120,92,0.2)',
                    }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: T.fg, letterSpacing: '0.02em' }}>
                    Loading Ledger & Accounts...
                </span>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{
                minHeight: '100vh',
                background: T.bg,
                padding: '40px 48px',
                fontFamily: 'var(--font-geist-sans), sans-serif',
                boxSizing: 'border-box',
            }}
        >
            {/* Header */}
            <div style={{ marginBottom: 36 }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: T.fg, margin: 0 }}>Financial Ledger</h1>
                <p style={{ color: T.muted, fontSize: '0.875rem', margin: '4px 0 0' }}>
                    Track sales, margins, and profit graphs automatically from completed bookings.
                </p>
            </div>

            {/* Top Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '24px 24px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <p style={{ fontSize: '0.8rem', color: T.muted, margin: 0, fontWeight: 500 }}>Total Revenue</p>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <DollarSign size={15} color={T.accent} strokeWidth={2} />
                        </div>
                    </div>
                    <p style={{ fontSize: '1.75rem', fontWeight: 700, color: T.fg, margin: '12px 0 0', lineHeight: 1.1 }}>
                        Rs {totalRevenue.toLocaleString('en-PK')}
                    </p>
                </div>

                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '24px 24px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <p style={{ fontSize: '0.8rem', color: T.muted, margin: 0, fontWeight: 500 }}>Total Profit</p>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={15} color={T.accent} strokeWidth={2} />
                        </div>
                    </div>
                    <p style={{ fontSize: '1.75rem', fontWeight: 700, color: totalProfit > 0 ? '#16a34a' : T.fg, margin: '12px 0 0', lineHeight: 1.1 }}>
                        Rs {totalProfit.toLocaleString('en-PK')}
                    </p>
                </div>
            </div>

            {/* 30-Day Graph */}
            <div style={{
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: '24px 24px 20px',
                marginBottom: 40,
            }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: T.fg, margin: '0 0 16px' }}>30-Day Profit Curve</h3>
                <ProfitChart data={graphData} height={180} />
            </div>

            {/* Booked list section */}
            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, background: T.card }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: T.fg, margin: 0 }}>Booked Shipment Ledger</h3>
                </div>

                {bookedOrders.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: T.muted }}>
                        No transactions recorded. Booked orders will populate ledger details here automatically.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {bookedOrders.map((o) => {
                            const isExpanded = expandedRow === o.id;
                            const prod = products.find((p) => p.id === o.productId);
                            const imgUrl = prod?.imageUrl || null;
                            const profitNum = Number(o.profit ?? 0);

                            return (
                                <div key={o.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                                    {/* Primary row */}
                                    <div 
                                        onClick={() => toggleRow(o.id)}
                                        style={{
                                            padding: '14px 20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            background: isExpanded ? T.accentLight : T.bg,
                                            transition: 'background 0.15s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            {/* Product Image */}
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '6px',
                                                background: T.card,
                                                border: `1px solid ${T.border}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                            }}>
                                                {imgUrl ? (
                                                    <img src={imgUrl} alt={prod?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <ImageOff size={16} color={T.muted} />
                                                )}
                                            </div>

                                            <div>
                                                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: T.fg, margin: 0 }}>
                                                    {prod?.name ?? o.productInfo ?? '—'}
                                                </p>
                                                <p style={{ fontSize: '0.75rem', color: T.muted, margin: '2px 0 0' }}>
                                                    Customer: {o.customerName || '—'}
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: profitNum > 0 ? '#16a34a' : '#dc2626', margin: 0 }}>
                                                    Rs {profitNum.toLocaleString('en-PK')}
                                                </p>
                                                <p style={{ fontSize: '0.7rem', color: T.muted, margin: '1px 0 0' }}>
                                                    Profit margin
                                                </p>
                                            </div>
                                            {isExpanded ? <ChevronUp size={16} color={T.muted} /> : <ChevronDown size={16} color={T.muted} />}
                                        </div>
                                    </div>

                                    {/* Expanded details */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                style={{ overflow: 'hidden', background: '#fafafa', borderTop: `1px solid ${T.border}` }}
                                            >
                                                <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
                                                    
                                                    {/* Customer Column */}
                                                    <div>
                                                        <h4 style={{ fontSize: '0.78rem', color: T.fg, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 12px' }}>
                                                            <User size={13} color={T.accent} /> Customer Details
                                                        </h4>
                                                        <p style={{ fontSize: '0.8rem', color: '#404040', margin: '0 0 6px' }}><strong>Name:</strong> {o.customerName || '—'}</p>
                                                        <p style={{ fontSize: '0.8rem', color: '#404040', margin: '0 0 6px' }}><strong>Phone:</strong> {o.phoneNumber || '—'}</p>
                                                        <p style={{ fontSize: '0.8rem', color: '#404040', margin: '0 0 6px' }}><strong>City:</strong> {o.city || '—'}</p>
                                                        <p style={{ fontSize: '0.8rem', color: '#404040', margin: 0 }}><strong>Address:</strong> {o.address || '—'}</p>
                                                    </div>

                                                    {/* Shipment details */}
                                                    <div>
                                                        <h4 style={{ fontSize: '0.78rem', color: T.fg, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 12px' }}>
                                                            <Package size={13} color={T.accent} /> Shipment Details
                                                        </h4>
                                                        <p style={{ fontSize: '0.8rem', color: '#404040', margin: '0 0 6px' }}><strong>Quantity:</strong> {o.quantity} units</p>
                                                        <p style={{ fontSize: '0.8rem', color: '#404040', margin: '0 0 6px' }}><strong>Weight:</strong> {o.weight ? `${o.weight} kg` : '0 kg'}</p>
                                                        <p style={{ fontSize: '0.8rem', color: '#404040', margin: '0 0 6px' }}><strong>Shipping:</strong> {o.shippingType || '—'}</p>
                                                        <p style={{ fontSize: '0.8rem', color: '#404040', margin: '0 0 6px' }}><strong>Tracking #:</strong> {o.trackingNumber || '—'}</p>
                                                        <p style={{ fontSize: '0.8rem', color: '#404040', margin: 0 }}><strong>Courier:</strong> {o.courierProvider || 'Flaship'}</p>
                                                    </div>

                                                    {/* Financial details */}
                                                    <div>
                                                        <h4 style={{ fontSize: '0.78rem', color: T.fg, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 12px' }}>
                                                            <Shield size={13} color={T.accent} /> Financial Margins
                                                        </h4>
                                                        <p style={{ fontSize: '0.8rem', color: '#404040', margin: '0 0 6px' }}><strong>Selling Price:</strong> Rs {o.sellingPrice ? Number(o.sellingPrice).toLocaleString('en-PK') : '0'}</p>
                                                        <p style={{ fontSize: '0.8rem', color: '#404040', margin: '0 0 6px' }}><strong>Cost Price:</strong> Rs {o.costPrice ? Number(o.costPrice).toLocaleString('en-PK') : '0'}</p>
                                                        <p style={{ fontSize: '0.8rem', color: '#404040', margin: '0 0 6px' }}><strong>Total Profit:</strong> Rs {profitNum.toLocaleString('en-PK')}</p>
                                                        <p style={{ fontSize: '0.8rem', color: '#404040', margin: 0 }}><strong>Booked At:</strong> {o.bookedAt ? new Date(o.bookedAt).toLocaleDateString('en-PK') + ' ' + new Date(o.bookedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </motion.div>
    );
}