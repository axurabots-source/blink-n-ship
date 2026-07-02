'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, RefreshCw, Search } from 'lucide-react';

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

export default function RateCards() {
    const [rates, setRates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [search, setSearch] = useState('');

    const loadRates = () => {
        setLoading(true);
        fetch('/api/courier/rate-cards')
            .then(r => r.json())
            .then(data => {
                if (data.rateCards) setRates(data.rateCards);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        loadRates();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/courier/rate-cards/sync', { method: 'POST' });
            if (res.ok) {
                loadRates();
            }
        } catch (e) {
            alert('Failed to sync rate cards');
        } finally {
            setSyncing(false);
        }
    };

    const filtered = rates.filter(r => {
        if (!search) return true;
        const term = search.toLowerCase();
        return (
            r.companyCode?.toLowerCase().includes(term) ||
            r.originZone?.toLowerCase().includes(term) ||
            r.destinationZone?.toLowerCase().includes(term) ||
            r.serviceType?.toLowerCase().includes(term)
        );
    });

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
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Service Rate Cards</h1>
                    <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">View negotiated carrier billing rates mapping origin and destination zones.</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: `1px solid ${T.border}`, padding: '10px 20px', borderRadius: '8px', background: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                    <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                    <span>Sync Rate Cards</span>
                </button>
            </div>

            {/* Filter */}
            <div style={{ marginBottom: '24px', position: 'relative', width: '300px' }}>
                <Search size={16} color={T.muted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                    type="text"
                    placeholder="Search rate cards..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: `1px solid ${T.border}`, fontSize: '0.8rem', outline: 'none' }}
                />
            </div>

            {/* Table */}
            <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: T.muted }}>Loading rate cards...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }} className="bns-table-wrap">
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.card, color: T.muted }}>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Courier Code</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Service Type</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Origin Zone</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Dest Zone</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Weight Slab (KG)</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Base Rate</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Extra KG Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: T.muted }}>No rate cards found.</td>
                                    </tr>
                                ) : (
                                    filtered.map((r, idx) => (
                                        <tr key={r.id || idx} style={{ borderBottom: idx === filtered.length - 1 ? 'none' : `1px solid ${T.border}` }}>
                                            <td style={{ padding: '16px 20px', fontWeight: 700, textTransform: 'uppercase' }}>{r.companyCode}</td>
                                            <td style={{ padding: '16px 20px', textTransform: 'capitalize' }}>{r.serviceType}</td>
                                            <td style={{ padding: '16px 20px' }}>{r.originZone}</td>
                                            <td style={{ padding: '16px 20px' }}>{r.destinationZone}</td>
                                            <td style={{ padding: '16px 20px' }}>{r.weightSlabMin?.toString()} - {r.weightSlabMax?.toString()}</td>
                                            <td style={{ padding: '16px 20px', fontWeight: 600 }}>PKR {r.baseRate?.toString()}</td>
                                            <td style={{ padding: '16px 20px', color: T.muted }}>PKR {r.perKgRate?.toString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
