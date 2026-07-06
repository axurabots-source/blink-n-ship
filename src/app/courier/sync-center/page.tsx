'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle2, AlertTriangle, Clock, Database, XCircle } from 'lucide-react';

const T = {
    bg: '#ffffff',
    fg: '#0a0a0a',
    accent: '#CC785C',
    accentHover: '#b8694e',
    accentLight: '#fff5f0',
    border: '#e5e5e5',
    muted: '#737373',
    card: '#fafafa',
    success: '#10b981',
    danger: '#ef4444',
    warn: '#f59e0b',
};

const DATASETS = [
    { key: 'companies',        label: 'Courier Carriers',          icon: '🚚' },
    { key: 'pickup_locations', label: 'Pickup Locations',          icon: '📍' },
    { key: 'cities',           label: 'Operational Cities',        icon: '🏙️' },
    { key: 'rate_cards',       label: 'Service Rate Cards',        icon: '💰' },
];

function formatDate(d?: string | null) {
    if (!d) return null;
    return new Date(d).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SyncCenter() {
    const [syncStatus, setSyncStatus] = useState<Record<string, any>>({});
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [lastOutcome, setLastOutcome] = useState<{ success: boolean; totalSynced: number; totalSkipped: number; durationMs: number; results: any } | null>(null);

    async function loadSyncStatus() {
        setLoadingStatus(true);
        try {
            const res = await fetch('/api/courier/sync/status');
            if (res.ok) {
                const data = await res.json();
                setSyncStatus(data.lastSyncs || {});
            }
        } catch { /* silently fail */ }
        finally { setLoadingStatus(false); }
    }

    useEffect(() => {
        loadSyncStatus();
    }, []);

    async function handleSyncAll() {
        setSyncing(true);
        setLastOutcome(null);
        try {
            const res = await fetch('/api/courier/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ types: ['companies', 'pickup_locations', 'cities', 'rate_cards'] }),
            });
            const data = await res.json();
            setLastOutcome({
                success: data.success,
                totalSynced: data.results
                    ? Object.values(data.results).reduce((acc: number, r: any) => acc + (r.count || 0), 0)
                    : 0,
                totalSkipped: data.totalSkipped || 0,
                durationMs: data.durationMs || 0,
                results: data.results || {},
            });
            await loadSyncStatus();
        } catch (e: any) {
            setLastOutcome({ success: false, totalSynced: 0, totalSkipped: 0, durationMs: 0, results: { error: e.message } });
        } finally {
            setSyncing(false);
        }
    }

    // Aggregate last sync time from all datasets
    const lastSyncTimes = DATASETS.map(d => syncStatus[d.key]?.completedAt || syncStatus[d.key]?.startedAt).filter(Boolean);
    const latestSyncTime = lastSyncTimes.length > 0
        ? formatDate(lastSyncTimes.sort().at(-1))
        : null;

    const overallStatus = DATASETS.every(d => syncStatus[d.key]?.status === 'success')
        ? 'success'
        : DATASETS.some(d => syncStatus[d.key]?.status === 'failed')
        ? 'failed'
        : DATASETS.some(d => !syncStatus[d.key])
        ? 'never'
        : 'partial';

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
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Courier Sync Center</h1>
                <p style={{ color: T.muted, fontSize: '0.875rem' }}>
                    Synchronize all courier reference data — carriers, pickup locations, operational cities, and rate cards — in one action.
                </p>
            </div>

            {/* Primary Action Card */}
            <div style={{
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: '32px',
                background: T.card,
                marginBottom: 28,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 24,
                flexWrap: 'wrap',
            }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 6 }}>Sync Courier Data</h2>
                    <p style={{ fontSize: '0.82rem', color: T.muted, marginBottom: 10 }}>
                        Refreshes all four reference datasets from Flaship in a single operation.
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Status badge */}
                        {overallStatus === 'success' && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: T.success, background: '#ecfdf5', border: '1px solid #6ee7b7', padding: '2px 8px', borderRadius: 20 }}>
                                ✓ All datasets synced
                            </span>
                        )}
                        {overallStatus === 'failed' && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: T.danger, background: '#fef2f2', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: 20 }}>
                                ✗ Last sync failed
                            </span>
                        )}
                        {overallStatus === 'never' && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: T.warn, background: '#fffbeb', border: '1px solid #fcd34d', padding: '2px 8px', borderRadius: 20 }}>
                                Not yet synced
                            </span>
                        )}
                        {overallStatus === 'partial' && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: T.warn, background: '#fffbeb', border: '1px solid #fcd34d', padding: '2px 8px', borderRadius: 20 }}>
                                Partial sync
                            </span>
                        )}
                        {/* Last sync time */}
                        {latestSyncTime && !loadingStatus && (
                            <span style={{ fontSize: '0.72rem', color: T.muted, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={11} />
                                Last synced: {latestSyncTime}
                            </span>
                        )}
                    </div>
                </div>

                <button
                    id="sync-all-btn"
                    onClick={handleSyncAll}
                    disabled={syncing}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: syncing ? '#e5e5e5' : T.accent,
                        color: syncing ? T.muted : '#fff',
                        border: 'none',
                        padding: '12px 28px',
                        borderRadius: 10,
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: syncing ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                    }}
                >
                    <RefreshCw size={16} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                    <span>{syncing ? 'Syncing...' : 'Sync Courier Data'}</span>
                </button>
            </div>

            {/* Outcome Banner */}
            {lastOutcome && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        padding: '14px 20px',
                        borderRadius: 10,
                        marginBottom: 24,
                        border: `1px solid ${lastOutcome.success ? '#6ee7b7' : '#fca5a5'}`,
                        background: lastOutcome.success ? '#ecfdf5' : '#fef2f2',
                        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                        fontSize: '0.83rem',
                    }}
                >
                    {lastOutcome.success ? <CheckCircle2 size={16} color={T.success} /> : <XCircle size={16} color={T.danger} />}
                    <span style={{ fontWeight: 700, color: lastOutcome.success ? T.success : T.danger }}>
                        {lastOutcome.success ? 'Sync completed successfully' : 'Sync completed with errors'}
                    </span>
                    <span style={{ color: T.muted }}>—</span>
                    <span style={{ color: T.muted }}>
                        <b style={{ color: T.fg }}>{lastOutcome.totalSynced}</b> records synced
                        {lastOutcome.totalSkipped > 0 && <>, <b style={{ color: T.warn }}>{lastOutcome.totalSkipped}</b> skipped</>}
                        {lastOutcome.durationMs > 0 && <> in <b style={{ color: T.fg }}>{(lastOutcome.durationMs / 1000).toFixed(1)}s</b></>}
                    </span>
                </motion.div>
            )}

            {/* Dataset Status Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }} className="bns-grid">
                {DATASETS.map(dataset => {
                    const s = syncStatus[dataset.key];
                    const outcome = lastOutcome?.results?.[dataset.key];
                    const status = outcome?.success === false ? 'failed' : outcome?.success ? 'success' : s?.status;
                    const count = outcome?.count ?? s?.recordsSynced ?? 0;
                    const skipped = outcome?.skipped ?? 0;
                    const syncedAt = s?.completedAt || s?.startedAt;

                    return (
                        <div key={dataset.key} style={{
                            border: `1px solid ${status === 'failed' ? '#fca5a5' : status === 'success' ? '#d1fae5' : T.border}`,
                            padding: '18px 20px',
                            borderRadius: 12,
                            background: T.card,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '1.2rem' }}>{dataset.icon}</span>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{dataset.label}</span>
                                </div>
                                {status === 'success' && <CheckCircle2 size={15} color={T.success} />}
                                {status === 'failed' && <AlertTriangle size={15} color={T.danger} />}
                                {!status && <Database size={15} color={T.muted} />}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.76rem', color: T.muted }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Status</span>
                                    <span style={{ fontWeight: 700, color: status === 'success' ? T.success : status === 'failed' ? T.danger : T.muted }}>
                                        {status ? status.toUpperCase() : 'NEVER RUN'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Records</span>
                                    <span style={{ fontWeight: 600, color: T.fg }}>{count}</span>
                                </div>
                                {skipped > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Skipped</span>
                                        <span style={{ fontWeight: 600, color: T.warn }}>{skipped}</span>
                                    </div>
                                )}
                                {syncedAt && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Last sync</span>
                                        <span style={{ color: T.fg }}>{formatDate(syncedAt)}</span>
                                    </div>
                                )}
                                {outcome?.error && (
                                    <div style={{ color: T.danger, marginTop: 2, fontSize: '0.72rem', wordBreak: 'break-word' }}>
                                        {outcome.error}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Loading overlay for status */}
            {loadingStatus && Object.keys(syncStatus).length === 0 && (
                <div style={{ marginTop: 24, color: T.muted, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Loading sync status...
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </motion.div>
    );
}
