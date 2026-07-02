'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, CheckCircle2, ShieldAlert, Clock, RefreshCw } from 'lucide-react';

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

export default function HealthMonitor() {
    const [health, setHealth] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadHealth = () => {
        setLoading(true);
        fetch('/api/courier/health')
            .then(r => r.json())
            .then(data => {
                setHealth(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        loadHealth();
    }, []);

    if (loading && !health) return <div style={{ padding: '40px 48px' }}>Pinging courier gateways...</div>;

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
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Courier API Health Monitor</h1>
                    <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">Observe current connectivity metrics and response rates of the Flaship gateway.</p>
                </div>
                <button
                    onClick={loadHealth}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: `1px solid ${T.border}`, padding: '10px 20px', borderRadius: '8px', background: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                    <RefreshCw size={16} />
                    <span>Ping Gateway</span>
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }} className="bns-grid">
                {/* Status */}
                <div style={{ border: `1px solid ${T.border}`, padding: '24px', borderRadius: '12px', background: T.card }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>Connection State</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                        {health?.isHealthy ? <CheckCircle2 size={24} color="#10b981" /> : <ShieldAlert size={24} color="#ef4444" />}
                        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                            {health?.isHealthy ? 'OPERATIONAL' : 'DISCONNECTED'}
                        </span>
                    </div>
                </div>

                {/* Response Latency */}
                <div style={{ border: `1px solid ${T.border}`, padding: '24px', borderRadius: '12px', background: T.card }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>Ping Latency</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '12px' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 700 }}>{health?.pingTimeMs || 0}</span>
                        <span style={{ fontSize: '0.85rem', color: T.muted, fontWeight: 500 }}>ms</span>
                    </div>
                </div>

                {/* Uptime Category */}
                <div style={{ border: `1px solid ${T.border}`, padding: '24px', borderRadius: '12px', background: T.card }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>API Provider</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                        <HeartPulse size={18} color={T.accent} />
                        <span style={{ fontSize: '1.1rem', fontWeight: 600, textTransform: 'uppercase' }}>Flaship Peru v1</span>
                    </div>
                </div>
            </div>

            {/* Error log feed */}
            <div style={{ border: `1px solid ${T.border}`, padding: '24px', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px' }}>Recent Failed Queries</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(!health?.recentErrors || health.recentErrors.length === 0) ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: T.muted }}>No failed queries logged recently. Gateway is fully operational.</div>
                    ) : (
                        health.recentErrors.map((e: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', gap: '16px', padding: '16px', background: T.card, border: `1px solid ${T.border}`, borderRadius: '8px' }}>
                                <ShieldAlert size={16} color="#ef4444" style={{ marginTop: '2px' }} />
                                <div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444' }}>{e.endpoint}</span>
                                    <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>{e.errorMessage || 'Internal gateway error response'}</p>
                                    <span style={{ fontSize: '0.7rem', color: T.muted, display: 'block', marginTop: '6px' }}>{new Date(e.calledAt).toLocaleString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </motion.div>
    );
}
