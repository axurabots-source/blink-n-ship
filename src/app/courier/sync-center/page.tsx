'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle2, AlertTriangle, Play, HelpCircle } from 'lucide-react';

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

export default function SyncCenter() {
    const [status, setStatus] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [syncingType, setSyncingType] = useState<string | null>(null);

    const loadSyncStatus = () => {
        setLoading(true);
        fetch('/api/courier/sync/status')
            .then(r => r.json())
            .then(data => {
                if (data.lastSyncs) setStatus(data.lastSyncs);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        loadSyncStatus();
    }, []);

    const triggerSync = async (type: string) => {
        setSyncingType(type);
        try {
            const types = type === 'full' ? ['companies', 'pickup_locations', 'cities', 'rate_cards', 'tracking'] : [type];
            const res = await fetch('/api/courier/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ types }),
            });
            if (res.ok) {
                loadSyncStatus();
            }
        } catch (e) {
            alert('Sync trigger failed');
        } finally {
            setSyncingType(null);
        }
    };

    const categories = [
        { key: 'companies', label: 'Courier Carriers', desc: 'Syncs available logistics carriers and logos' },
        { key: 'pickup_locations', label: 'Pickup Locations', desc: 'Syncs warehouse and office dispatch addresses' },
        { key: 'cities', label: 'Operational Cities', desc: 'Maps operational shipping destination nodes' },
        { key: 'rate_cards', label: 'Service Rate Cards', desc: 'Updates slab prices and zone adjustments' },
        { key: 'tracking', label: 'Consignment Milestones', desc: 'Pulls latest events for active shipments' },
    ];

    if (loading && Object.keys(status).length === 0) return <div style={{ padding: '40px 48px' }}>Loading sync parameters...</div>;

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
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Courier Sync Center</h1>
                    <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">Synchronize available destination nodes, weight rates, and active consignments.</p>
                </div>
                <button
                    onClick={() => triggerSync('full')}
                    disabled={!!syncingType}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: T.accent, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                    <RefreshCw size={16} className={syncingType === 'full' ? 'animate-spin' : ''} />
                    <span>Run Global Sync</span>
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', maxWidth: '1000px' }} className="bns-grid">
                {categories.map((c) => {
                    const lastRun = status[c.key];
                    const isSyncing = syncingType === c.key;

                    return (
                        <div key={c.key} style={{ border: `1px solid ${T.border}`, padding: '24px', borderRadius: '12px', background: T.card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{c.label}</h3>
                                <p style={{ fontSize: '0.8rem', color: T.muted, marginTop: '2px' }}>{c.desc}</p>
                            </div>

                            <div style={{ fontSize: '0.78rem', background: '#fff', border: `1px solid ${T.border}`, padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: T.muted }}>Status</span>
                                    {lastRun ? (
                                        <span style={{ fontWeight: 600, color: lastRun.status === 'success' ? '#10b981' : '#ef4444' }}>
                                            {lastRun.status.toUpperCase()}
                                        </span>
                                    ) : (
                                        <span style={{ color: T.muted }}>NEVER RUN</span>
                                    )}
                                </div>
                                {lastRun && (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: T.muted }}>Records Synced</span>
                                            <span style={{ fontWeight: 600 }}>{lastRun.recordsSynced || 0}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: T.muted }}>Last Executed</span>
                                            <span style={{ fontWeight: 500 }}>{new Date(lastRun.completedAt || lastRun.startedAt).toLocaleString()}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={() => triggerSync(c.key)}
                                disabled={!!syncingType}
                                style={{ width: '100%', padding: '10px', border: `1px solid ${T.border}`, background: '#fff', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s ease' }}
                            >
                                <Play size={14} />
                                <span>Sync Now</span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}
