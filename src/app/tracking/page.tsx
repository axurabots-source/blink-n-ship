'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Package, Search, MapPin, Clock, RefreshCw, 
    TrendingUp, CheckCircle, AlertTriangle, XCircle,
    Truck, Eye, ExternalLink, Radio
} from 'lucide-react';
import Link from 'next/link';

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

const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
    booked:        { bg: '#fff5f0', fg: '#CC785C', label: 'Booked' },
    in_transit:    { bg: '#fff7ed', fg: '#d97706', label: 'In Transit' },
    out_for_delivery: { bg: '#eff6ff', fg: '#2563eb', label: 'Out for Delivery' },
    delivered:     { bg: '#ecfdf5', fg: '#059669', label: 'Delivered' },
    returned:      { bg: '#fef2f2', fg: '#dc2626', label: 'Returned' },
    cancelled:     { bg: '#f5f5f5', fg: '#737373', label: 'Cancelled' },
    failed:        { bg: '#fef2f2', fg: '#dc2626', label: 'Failed' },
};

function LiveDot() {
    return (
        <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: '#10b981', position: 'relative',
        }}>
            <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: '#10b981', opacity: 0.4,
                animation: 'pulse-dot 2s ease-in-out infinite',
            }} />
        </span>
    );
}

export default function TrackingPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [trackingInput, setTrackingInput] = useState('');
    const [trackingResult, setTrackingResult] = useState<any>(null);
    const [trackingLoading, setTrackingLoading] = useState(false);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await fetch('/api/tracking');
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
            }
        } catch {
            //
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 15000);
        return () => clearInterval(interval);
    }, [fetchOrders]);

    async function handleTrackSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!trackingInput.trim()) return;
        setTrackingLoading(true);
        setTrackingResult(null);
        setError('');
        try {
            const res = await fetch('/api/courier/track/' + trackingInput.trim());
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Not found');
            setTrackingResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setTrackingLoading(false);
        }
    }

    const booked = orders.filter(o => o.shipment?.status === 'booked' || o.status === 'booked').length;
    const inTransit = orders.filter(o => o.shipment?.status === 'in_transit' || o.shipment?.status === 'out_for_delivery').length;
    const delivered = orders.filter(o => o.shipment?.status === 'delivered').length;
    const issues = orders.filter(o => ['returned', 'cancelled', 'failed'].includes(o.shipment?.status)).length;

    const filtered = searchQuery.trim()
        ? orders.filter(o =>
            String(o.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(o.trackingNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(o.city || '').toLowerCase().includes(searchQuery.toLowerCase())
          )
        : orders;

    const statCards = [
        { label: 'Active Orders', value: booked, icon: Package, color: '#CC785C', bg: '#fff5f0' },
        { label: 'In Transit', value: inTransit, icon: TrendingUp, color: '#d97706', bg: '#fff7ed' },
        { label: 'Delivered', value: delivered, icon: CheckCircle, color: '#059669', bg: '#ecfdf5' },
        { label: 'Issues', value: issues, icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{ padding: '40px 48px', fontFamily: 'var(--font-geist-sans), sans-serif', color: T.fg, backgroundColor: T.bg, minHeight: '100vh' }}
        >
            <style>{'@keyframes pulse-dot { 0%, 100% { transform: scale(1); } 50% { transform: scale(2.2); } }'}</style>

            {/* Header with radar feel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Radio size={22} color={T.accent} />
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                                Control Tower
                            </h1>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 20, fontSize: '0.65rem', fontWeight: 700, color: '#059669' }}>
                            <LiveDot />
                            TRACKING LIVE 15S
                        </div>
                    </div>
                    <p style={{ color: T.muted, fontSize: '0.85rem', margin: '4px 0 0' }}>
                        Real-time radar — {orders.length} order{orders.length !== 1 ? 's' : ''} on the grid
                    </p>
                </div>
                <button onClick={fetchOrders} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.8rem', fontWeight: 600, color: T.accent, background: T.accentLight, border: '1px solid #f0d4c8', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>

            {/* Stats Scanline */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ padding: '20px 24px', background: '#fff', border: '1px solid ' + T.border, borderRadius: 12, position: 'relative', overflow: 'hidden' }}
                        >
                            <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: card.color }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</span>
                                <Icon size={16} color={card.color} />
                            </div>
                            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: card.color }}>{card.value}</span>
                        </motion.div>
                    );
                })}
            </div>

            {/* Scanner Input */}
            <div style={{ marginBottom: 32 }}>
                <form onSubmit={handleTrackSubmit} style={{ display: 'flex', gap: 10, maxWidth: 500 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={14} color={T.muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Scan or enter tracking number..."
                            value={trackingInput}
                            onChange={e => setTrackingInput(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px 10px 36px', fontSize: '0.85rem', border: '1px solid ' + T.border, borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={trackingLoading || !trackingInput.trim()}
                        style={{ padding: '10px 20px', background: T.accent, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', opacity: trackingLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        {trackingLoading ? <RefreshCw size={14} /> : <Eye size={14} />}
                        Track
                    </button>
                </form>
                {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <XCircle size={14} />
                        {error}
                    </motion.div>
                )}
            </div>

            {/* Quick Scan Result */}
            <AnimatePresence>
                {trackingResult && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        style={{ marginBottom: 32, padding: 20, background: '#fff', border: '1px solid ' + T.border, borderRadius: 12, maxWidth: 600 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>Scanned Shipment</span>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: T.accent }}>{trackingInput}</div>
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: STATUS_STYLES[trackingResult.shipment?.status]?.bg || T.accentLight, color: STATUS_STYLES[trackingResult.shipment?.status]?.fg || T.accent }}>
                                {STATUS_STYLES[trackingResult.shipment?.status]?.label || trackingResult.shipment?.status || 'Active'}
                            </div>
                        </div>
                        {trackingResult.timeline?.length > 0 && (
                            <div style={{ fontSize: '0.8rem', color: T.muted }}>
                                Latest: {String(trackingResult.timeline[trackingResult.timeline.length - 1]?.description || trackingResult.timeline[trackingResult.timeline.length - 1]?.status || '')}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Orders Radar Grid */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Radar Grid</h2>
                    <input
                        type="text"
                        placeholder="Filter by name, tracking, city..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ padding: '8px 12px', fontSize: '0.8rem', border: '1px solid ' + T.border, borderRadius: 8, outline: 'none', width: 240 }}
                    />
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: T.muted }}>
                        <div style={{ fontSize: '0.85rem' }}>Scanning horizon...</div>
                    </div>
                ) : filtered.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: 60, textAlign: 'center', color: T.muted }}>
                        <Radio size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                        <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>Radar is clear</div>
                        <div style={{ fontSize: '0.85rem' }}>No tracked orders in range. Book shipments to see them live.</div>
                        <Link href="/orders" style={{ display: 'inline-block', marginTop: 16, padding: '8px 20px', background: T.accent, color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                            Go to Booking
                        </Link>
                    </motion.div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <AnimatePresence>
                            {filtered.map((order, idx) => {
                                const st = order.shipment?.status || order.courierStatus || order.status;
                                const s = STATUS_STYLES[st] || STATUS_STYLES.booked;
                                const latestEvent = order.shipment?.timeline?.[0];
                                return (
                                    <motion.div
                                        key={order.id}
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.04, duration: 0.25 }}
                                        style={{ padding: '14px 18px', background: '#fff', border: '1px solid ' + T.border, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14 }}
                                    >
                                        <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {st === 'delivered' ? <CheckCircle size={16} color={s.fg} /> :
                                             st === 'in_transit' || st === 'out_for_delivery' ? <Truck size={16} color={s.fg} /> :
                                             st === 'returned' || st === 'cancelled' || st === 'failed' ? <XCircle size={16} color={s.fg} /> :
                                             <Package size={16} color={s.fg} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{order.customerName || 'Unknown'}</span>
                                                {order.trackingNumber && (
                                                    <span style={{ fontSize: '0.7rem', color: T.accent, fontWeight: 600, background: T.accentLight, padding: '1px 6px', borderRadius: 4 }}>
                                                        #{order.trackingNumber}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.72rem', color: T.muted, flexWrap: 'wrap' }}>
                                                {order.city && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                        <MapPin size={10} />{order.city}
                                                    </span>
                                                )}
                                                {order.shipment?.lastTrackedAt && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                                        <Clock size={10} />{new Date(order.shipment.lastTrackedAt).toLocaleString()}
                                                    </span>
                                                )}
                                                {latestEvent?.description && (
                                                    <span style={{ color: s.fg }}>
                                                        {String(latestEvent.description).length > 35 ? String(latestEvent.description).slice(0, 35) + '...' : latestEvent.description}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: s.bg, color: s.fg, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                            {s.label}
                                        </div>
                                        {order.shipment?.id && (
                                            <Link href="/courier/shipments" style={{ color: T.muted, flexShrink: 0 }} title="View Details">
                                                <ExternalLink size={13} />
                                            </Link>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
