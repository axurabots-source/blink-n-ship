'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
    TrendingUp, Package, CheckCircle, AlertTriangle, 
    RefreshCw, Play, RefreshCwOff, ShieldAlert, ArrowUpRight 
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

interface Stats {
    totalBooked: number;
    pending: number;
    inTransit: number;
    delivered: number;
    returned: number;
    cancelled: number;
    failed: number;
}

export default function CourierDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [recentShipments, setRecentShipments] = useState<any[]>([]);
    const [recentErrors, setRecentErrors] = useState<any[]>([]);
    const [lastSync, setLastSync] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load from memory cache instantly
        const cache = (window as any).__BNS_CACHE__;
        if (cache && cache.courierDashboard) {
            const cd = cache.courierDashboard;
            if (cd.stats) setStats(cd.stats);
            if (cd.recentShipments) setRecentShipments(cd.recentShipments);
            if (cd.recentErrors) setRecentErrors(cd.recentErrors);
            if (cd.lastSync) setLastSync(cd.lastSync);
            setLoading(false);
        }

        fetch('/api/courier/dashboard')
            .then(r => r.json())
            .then(data => {
                if (data.stats) setStats(data.stats);
                if (data.recentShipments) setRecentShipments(data.recentShipments);
                if (data.recentErrors) setRecentErrors(data.recentErrors);
                if (data.lastSync) setLastSync(data.lastSync);
                
                // Update cache
                if (!(window as any).__BNS_CACHE__) (window as any).__BNS_CACHE__ = {};
                (window as any).__BNS_CACHE__.courierDashboard = data;
            })
            .catch(() => {})
            .finally(() => {
                setLoading(false);
            });
    }, []);

    if (loading && !stats) {
        return (
            <div style={{ padding: '40px 48px', fontFamily: 'var(--font-geist-sans), sans-serif' }}>
                <div style={{ height: '32px', width: '200px', background: T.border, borderRadius: '4px', marginBottom: '24px', animation: 'pulse 1.5s infinite' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }} className="bns-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{ height: '120px', background: T.card, border: `1px solid ${T.border}`, borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
                    ))}
                </div>
                <style>{`@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }`}</style>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }} className="bns-header">
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Courier Integration</h1>
                    <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">Manage operational parameters, live tracking, and integrations.</p>
                </div>
                {lastSync && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: T.muted }}>
                        <RefreshCw size={14} />
                        <span>Last sync: {new Date(lastSync.completedAt || lastSync.startedAt).toLocaleString()}</span>
                    </div>
                )}
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }} className="bns-grid">
                <div style={{ padding: '24px', background: T.card, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Booked</span>
                        <Package size={18} color={T.accent} />
                    </div>
                    <span style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{stats?.totalBooked || 0}</span>
                </div>
                <div style={{ padding: '24px', background: T.card, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Transit</span>
                        <TrendingUp size={18} color="#CC785C" />
                    </div>
                    <span style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{stats?.inTransit || 0}</span>
                </div>
                <div style={{ padding: '24px', background: T.card, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivered</span>
                        <CheckCircle size={18} color="#10b981" />
                    </div>
                    <span style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{stats?.delivered || 0}</span>
                </div>
                <div style={{ padding: '24px', background: T.card, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Returned</span>
                        <AlertTriangle size={18} color="#f59e0b" />
                    </div>
                    <span style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{stats?.returned || 0}</span>
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
