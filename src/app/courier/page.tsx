'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
    TrendingUp, Package, CheckCircle, AlertTriangle, 
    RefreshCw, Play, RefreshCwOff, ShieldAlert, ArrowUpRight, Eye, Search 
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/components/Toast";

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

interface Stats {
    totalBooked: number;
    pending: number;
    inTransit: number;
    delivered: number;
    returned: number;
    cancelled: number;
    failed: number;
}

interface LiveStats {
    booked: number;
    cancelled: number;
    inTransit: number;
    delivered: number;
}

export default function CourierDashboard() {
    const { toast } = useToast();
    const [stats, setStats] = useState<Stats | null>(null);
    const [recentShipments, setRecentShipments] = useState<any[]>([]);
    const [recentErrors, setRecentErrors] = useState<any[]>([]);
    const [lastSync, setLastSync] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [liveStats, setLiveStats] = useState<LiveStats | null>(null);

    async function fetchLiveStats() {
        try {
            const res = await fetch('/api/courier/dashboard/stats');
            if (res.ok) {
                const data = await res.json();
                setLiveStats(data);
            }
        } catch { /* silent */ }
    }

    async function fetchCourierDashboard() {
        try {
            const res = await fetch('/api/courier/dashboard');
            const data = await res.json();
            if (data.stats) setStats(data.stats);
            if (data.recentShipments) setRecentShipments(data.recentShipments);
            if (data.recentErrors) setRecentErrors(data.recentErrors);
            if (data.lastSync) setLastSync(data.lastSync);
            
            if (!(window as any).__BNS_CACHE__) (window as any).__BNS_CACHE__ = {};
            (window as any).__BNS_CACHE__.courierDashboard = data;
        } catch (e) {
            console.error('Failed to load courier dashboard:', e);
            toast('error', 'Failed to load courier dashboard data');
        }
    }

    useEffect(() => {
        const cache = (window as any).__BNS_CACHE__;
        if (cache && cache.courierDashboard) {
            const cd = cache.courierDashboard;
            if (cd.stats) setStats(cd.stats);
            if (cd.recentShipments) setRecentShipments(cd.recentShipments);
            if (cd.recentErrors) setRecentErrors(cd.recentErrors);
            if (cd.lastSync) setLastSync(cd.lastSync);
        }

        fetchLiveStats();
        fetchCourierDashboard().finally(() => setLoading(false));

        const interval = setInterval(fetchCourierDashboard, 30000);
        const liveInterval = setInterval(fetchLiveStats, 10000);
        return () => { clearInterval(interval); clearInterval(liveInterval); };
    }, []);

    async function handleRefresh() {
        setRefreshing(true);
        await fetchCourierDashboard();
        setRefreshing(false);
    }

    if (loading && !stats) {
        return (
            <div style={{ padding: '40px 48px', fontFamily: 'var(--font-geist-sans), sans-serif' }}>
                <div style={{ height: '32px', width: '200px', background: T.border, borderRadius: '4px', marginBottom: '24px', animation: 'pulse 1.5s infinite' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }} className="bns-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{ height: '120px', background: T.card, border: `1px solid ${T.border}`, borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
                    ))}
                </div>
                <style>{`@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } } .bns-spin { animation: spin 0.8s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }


    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
                padding: '40px 48px',
                fontFamily: 'var(--font-geist-sans), sans-serif',
                color: T.fg,
                backgroundColor: T.bg,
                minHeight: '100vh',
            }}
            className="bns-page"
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }} className="bns-header">
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Courier Integration</h1>
                    <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">Manage operational parameters, live tracking, and integrations.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: T.accent,
                            background: T.accentLight,
                            border: '1px solid #f0d4c8',
                            borderRadius: 8,
                            cursor: refreshing ? 'not-allowed' : 'pointer',
                            opacity: refreshing ? 0.6 : 1,
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => { if (!refreshing) e.currentTarget.style.background = '#fce8df'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = T.accentLight; }}
                    >
                        <RefreshCw size={14} className={refreshing ? 'bns-spin' : ''} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    {lastSync && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: T.muted }}>
                            <RefreshCw size={14} />
                            <span>Last sync: {new Date(lastSync.completedAt || lastSync.startedAt).toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Live Status Bar — auto-refreshes every 10s */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, color: '#059669', letterSpacing: '0.03em' }}>
                    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
                    LIVE
                </div>
                <span style={{ fontSize: '0.72rem', color: T.muted }}>Auto-refreshing every 10s</span>
            </div>

            {/* Live Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }} className="bns-grid">
                <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #fff5f0 0%, #ffffff 100%)', border: `1px solid ${T.border}`, borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#CC785C', borderRadius: '12px 0 0 12px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booked</span>
                        <Package size={16} color={T.accent} />
                    </div>
                    <span style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em', color: T.accent }}>{liveStats?.booked ?? stats?.totalBooked ?? 0}</span>
                </div>
                <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)', border: `1px solid ${T.border}`, borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#f59e0b', borderRadius: '12px 0 0 12px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Transit</span>
                        <TrendingUp size={16} color="#f59e0b" />
                    </div>
                    <span style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#d97706' }}>{liveStats?.inTransit ?? stats?.inTransit ?? 0}</span>
                </div>
                <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)', border: `1px solid ${T.border}`, borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#10b981', borderRadius: '12px 0 0 12px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivered</span>
                        <CheckCircle size={16} color="#10b981" />
                    </div>
                    <span style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#059669' }}>{liveStats?.delivered ?? stats?.delivered ?? 0}</span>
                </div>
                <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)', border: `1px solid ${T.border}`, borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#ef4444', borderRadius: '12px 0 0 12px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cancelled</span>
                        <AlertTriangle size={16} color="#ef4444" />
                    </div>
                    <span style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#dc2626' }}>{liveStats?.cancelled ?? stats?.cancelled ?? 0}</span>
                </div>
            </div>

            {/* Full Stats Row (detailed) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }} className="bns-grid">
                <div style={{ padding: '20px 24px', background: T.card, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Booked</span>
                        <Package size={16} color={T.accent} />
                    </div>
                    <span style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{stats?.totalBooked || 0}</span>
                </div>
                <div style={{ padding: '20px 24px', background: T.card, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</span>
                        <TrendingUp size={16} color="#CC785C" />
                    </div>
                    <span style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{stats?.pending || 0}</span>
                </div>
                <div style={{ padding: '20px 24px', background: T.card, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Returned</span>
                        <AlertTriangle size={16} color="#f59e0b" />
                    </div>
                    <span style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{stats?.returned || 0}</span>
                </div>
                <div style={{ padding: '20px 24px', background: T.card, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Failed</span>
                        <AlertTriangle size={16} color="#ef4444" />
                    </div>
                    <span style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{stats?.failed || 0}</span>
                </div>
            </div>

            {/* Quick Actions Panel */}
            <div style={{ padding: '24px', border: `1px solid ${T.border}`, borderRadius: '12px', background: T.card, marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h3>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <Link href="/orders" style={{ textDecoration: 'none', color: '#fff', background: T.accent, padding: '10px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s ease' }}>
                        <span>Book Draft Orders</span>
                        <ArrowUpRight size={16} />
                    </Link>
                    <Link href="/orders" style={{ textDecoration: 'none', color: T.fg, border: `1px solid ${T.border}`, background: '#fff', padding: '10px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={16} />
                        <span>Reload Orders</span>
                    </Link>
                    <Link href="/tracking" style={{ textDecoration: 'none', color: '#fff', background: '#059669', padding: '10px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <Eye size={16} />
                        <span>Live Tracking</span>
                    </Link>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }} className="bns-grid">
                {/* Recent Shipments */}
                <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '24px', overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Recent Shipments</h3>
                    <div style={{ overflowX: 'auto' }} className="bns-table-wrap">
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}`, color: T.muted }}>
                                    <th style={{ padding: '12px 16px', fontWeight: 500 }}>Tracking #</th>
                                    <th style={{ padding: '12px 16px', fontWeight: 500 }}>Recipient</th>
                                    <th style={{ padding: '12px 16px', fontWeight: 500 }}>City</th>
                                    <th style={{ padding: '12px 16px', fontWeight: 500 }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentShipments.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: T.muted }}>No shipments booked yet.</td>
                                    </tr>
                                ) : (
                                    recentShipments.map((s, idx) => (
                                        <tr key={s.id || idx} style={{ borderBottom: idx === recentShipments.length - 1 ? 'none' : `1px solid ${T.border}` }}>
                                            <td style={{ padding: '14px 16px', fontWeight: 600 }}>{s.trackingNumber || 'Pending'}</td>
                                            <td style={{ padding: '14px 16px' }}>{s.recipientName}</td>
                                            <td style={{ padding: '14px 16px' }}>{s.recipientCity}</td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    background: s.status === 'delivered' ? 'rgba(16,185,129,0.1)' : s.status === 'returned' ? 'rgba(239,68,68,0.1)' : 'rgba(204,120,92,0.1)',
                                                    color: s.status === 'delivered' ? '#10b981' : s.status === 'returned' ? '#ef4444' : '#CC785C',
                                                    textTransform: 'uppercase',
                                                }}>
                                                    {s.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* API Logs & Errors Panel */}
                <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Recent Failures</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {recentErrors.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', color: T.muted }}>
                                <RefreshCwOff size={32} style={{ marginBottom: '12px' }} />
                                <span style={{ fontSize: '0.875rem' }}>No recent errors. API is healthy.</span>
                            </div>
                        ) : (
                            recentErrors.map((e, idx) => (
                                <div key={e.id || idx} style={{ display: 'flex', gap: '12px', padding: '12px', background: T.card, border: `1px solid ${T.border}`, borderRadius: '8px' }}>
                                    <ShieldAlert size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444' }}>{e.endpoint}</span>
                                        <p style={{ fontSize: '0.78rem', color: T.fg, margin: '4px 0' }}>{e.errorMessage || 'Unknown Error'}</p>
                                        <span style={{ fontSize: '0.7rem', color: T.muted }}>{new Date(e.calledAt).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
