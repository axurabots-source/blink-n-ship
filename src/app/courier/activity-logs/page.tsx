'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, Key, RefreshCw, Layers } from 'lucide-react';

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

export default function ActivityLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/courier/activity-logs?page=${page}&limit=25`)
            .then(r => r.json())
            .then(data => {
                if (data.logs) setLogs(data.logs);
                if (data.total) setTotal(data.total);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [page]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'connect': return <Key size={16} color={T.accent} />;
            case 'sync': return <RefreshCw size={16} color="#f59e0b" />;
            case 'error': return <ShieldAlert size={16} color="#ef4444" />;
            default: return <Layers size={16} color={T.fg} />;
        }
    };

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
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Courier Audit Trails</h1>
                <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">View history logs tracking automated background tasks, updates, and merchant actions.</p>
            </div>

            <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', background: T.card, padding: '24px' }}>
                {loading ? (
                    <div style={{ padding: '20px', color: T.muted }}>Loading activity logs...</div>
                ) : logs.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: T.muted }}>No activity logged yet.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {logs.map((l) => (
                            <div key={l.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
                                <div style={{ background: T.accentLight, padding: '8px', borderRadius: '8px', flexShrink: 0 }}>
                                    {getIcon(l.eventType)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{l.description}</p>
                                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: T.muted, marginTop: '4px' }}>
                                        <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{l.eventType}</span>
                                        <span>•</span>
                                        <span>{new Date(l.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
