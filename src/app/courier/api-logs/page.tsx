'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, ShieldAlert, ArrowDownRight, RefreshCw, Layers } from 'lucide-react';

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

export default function ApiLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/courier/api-logs?limit=50')
            .then(r => r.json())
            .then(data => {
                if (data.logs) setLogs(data.logs);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const toggleExpand = (id: string) => {
        setExpanded(prev => prev === id ? null : id);
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
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Courier API Logs</h1>
                <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">View technical request and response exchange structures connecting with Flaship Peru.</p>
            </div>

            <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '20px', color: T.muted }}>Loading integration logs...</div>
                ) : logs.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: T.muted }}>No integration payloads recorded yet.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }} className="bns-table-wrap">
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.card, color: T.muted }}>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Timestamp</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Endpoint</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Method</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Response Code</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Response Time</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500, textAlign: 'right' }}>Payload</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((l) => {
                                    const isExp = expanded === l.id;
                                    return (
                                        <>
                                            <tr key={l.id} style={{ borderBottom: isExp ? 'none' : `1px solid ${T.border}` }}>
                                                <td style={{ padding: '16px 20px', fontSize: '0.78rem', color: T.muted }}>
                                                    {new Date(l.calledAt).toLocaleTimeString()}
                                                </td>
                                                <td style={{ padding: '16px 20px', fontWeight: 600 }}>{l.endpoint}</td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: T.accentLight, color: T.accent }}>
                                                        {l.method}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <span style={{ fontWeight: 600, color: l.isSuccess ? '#10b981' : '#ef4444' }}>
                                                        {l.statusCode || '---'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 20px', color: T.muted }}>{l.durationMs} ms</td>
                                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                    <button onClick={() => toggleExpand(l.id)} style={{ background: 'none', border: `1px solid ${T.border}`, padding: '6px 12px', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer' }}>
                                                        {isExp ? 'Hide' : 'Inspect'}
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExp && (
                                                <tr style={{ background: T.card, borderBottom: `1px solid ${T.border}` }}>
                                                    <td colSpan={6} style={{ padding: '24px' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="bns-grid">
                                                            <div>
                                                                <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: '8px' }}>Request Payload</h4>
                                                                <pre style={{ background: '#fff', border: `1px solid ${T.border}`, padding: '12px', borderRadius: '6px', fontSize: '0.75rem', overflowX: 'auto', fontFamily: 'monospace' }}>
                                                                    {JSON.stringify(l.requestBody, null, 2)}
                                                                </pre>
                                                            </div>
                                                            <div>
                                                                <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: '8px' }}>Response Payload</h4>
                                                                <pre style={{ background: '#fff', border: `1px solid ${T.border}`, padding: '12px', borderRadius: '6px', fontSize: '0.75rem', overflowX: 'auto', fontFamily: 'monospace' }}>
                                                                    {JSON.stringify(l.responseBody, null, 2)}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
