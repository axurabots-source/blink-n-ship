'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Check, RefreshCw } from 'lucide-react';

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

export default function CourierCompanies() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const loadCompanies = () => {
        setLoading(true);
        fetch('/api/courier/companies')
            .then(r => r.json())
            .then(data => {
                if (data.companies) setCompanies(data.companies);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        loadCompanies();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/courier/companies/sync', { method: 'POST' });
            if (res.ok) {
                loadCompanies();
            }
        } catch (e) {
            alert('Failed to sync courier companies');
        } finally {
            setSyncing(false);
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }} className="bns-header">
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Courier Companies</h1>
                    <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">View linked courier carriers currently integrated and active on Flaship.</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: `1px solid ${T.border}`, padding: '10px 20px', borderRadius: '8px', background: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                    <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                    <span>Sync Carriers</span>
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '20px', color: T.muted }}>Loading carriers...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }} className="bns-grid">
                    {companies.map((c) => (
                        <div key={c.id} style={{ border: `1px solid ${T.border}`, padding: '24px', borderRadius: '12px', background: T.card, display: 'flex', gap: '16px', alignItems: 'center', position: 'relative' }}>
                            <div style={{ background: T.accentLight, padding: '12px', borderRadius: '10px', color: T.accent }}>
                                <Truck size={24} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{c.name}</h3>
                                <p style={{ fontSize: '0.8rem', color: T.muted, textTransform: 'uppercase', marginTop: '2px', fontFamily: 'monospace' }}>Code: {c.code}</p>
                            </div>
                            {c.isDefault && (
                                <span style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '3px 8px', borderRadius: '20px' }}>
                                    <Check size={10} />
                                    <span>Default</span>
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
