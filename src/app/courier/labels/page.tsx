'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Printer, Download, RefreshCw, CheckSquare, Square, Search } from 'lucide-react';
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

export default function CourierLabels() {
    const { toast } = useToast();
    const [shipments, setShipments] = useState<any[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch('/api/courier/bookings?limit=50')
            .then(r => r.json())
            .then(data => {
                if (data.shipments) setShipments(data.shipments);
                setLoading(false);
            })
            .catch(() => { setLoading(false); toast('error', 'Failed to load data'); });
    }, []);

    const filtered = shipments.filter(s => {
        if (!search) return true;
        const term = search.toLowerCase();
        return (
            s.trackingNumber?.toLowerCase().includes(term) ||
            s.recipientName?.toLowerCase().includes(term) ||
            s.recipientCity?.toLowerCase().includes(term)
        );
    });

    const toggleSelect = (id: string) => {
        setSelected(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selected.length === filtered.length) {
            setSelected([]);
        } else {
            setSelected(filtered.map(s => s.id));
        }
    };

    const handleBulkGenerate = async () => {
        if (selected.length === 0) return;
        setGenerating(true);
        try {
            const res = await fetch('/api/courier/labels/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shipmentIds: selected }),
            });
            if (res.ok) {
                toast('success', `Successfully generated/cached labels for ${selected.length} shipments.`);
                setSelected([]);
            }
        } catch (e) {
            toast('error', 'Label generation failed');
        } finally {
            setGenerating(false);
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
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Shipping Label Generator</h1>
                    <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">Generate and print PDF consignment labels for active carriers.</p>
                </div>
            </div>

            {/* Actions & Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={toggleSelectAll}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: `1px solid ${T.border}`, padding: '8px 16px', borderRadius: '6px', background: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: T.muted }}
                    >
                        {selected.length === filtered.length && filtered.length > 0 ? <CheckSquare size={14} color={T.accent} /> : <Square size={14} />}
                        <span>Select All ({selected.length})</span>
                    </button>
                    {selected.length > 0 && (
                        <button
                            onClick={handleBulkGenerate}
                            disabled={generating}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: T.accent, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                            {generating ? <RefreshCw size={14} className="animate-spin" /> : <Printer size={14} />}
                            <span>Bulk Generate ({selected.length})</span>
                        </button>
                    )}
                </div>

                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={16} color={T.muted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Filter shipments..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', border: `1px solid ${T.border}`, fontSize: '0.8rem', outline: 'none' }}
                    />
                </div>
            </div>

            {/* List */}
            <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: T.muted }}>Loading labels...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }} className="bns-table-wrap">
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.card, color: T.muted }}>
                                    <th style={{ padding: '14px 20px', width: '40px' }}></th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Consignment</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Recipient</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>City</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Status</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: T.muted }}>No labels to generate.</td>
                                    </tr>
                                ) : (
                                    filtered.map((s, idx) => {
                                        const isSel = selected.includes(s.id);
                                        return (
                                            <tr key={s.id || idx} style={{ borderBottom: idx === filtered.length - 1 ? 'none' : `1px solid ${T.border}` }}>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <button onClick={() => toggleSelect(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSel ? T.accent : T.muted }}>
                                                        {isSel ? <CheckSquare size={16} /> : <Square size={16} />}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '16px 20px', fontWeight: 700 }}>{s.trackingNumber || 'Pending'}</td>
                                                <td style={{ padding: '16px 20px' }}>{s.recipientName}</td>
                                                <td style={{ padding: '16px 20px' }}>{s.recipientCity}</td>
                                                <td style={{ padding: '16px 20px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, color: T.muted }}>{s.status}</td>
                                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                    {s.labelUrl ? (
                                                        <a href={s.labelUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: `1px solid ${T.border}`, padding: '6px 12px', borderRadius: '4px', fontSize: '0.78rem', color: T.fg, textDecoration: 'none' }}>
                                                            <Printer size={12} />
                                                            <span>Print Label</span>
                                                        </a>
                                                    ) : (
                                                        <span style={{ fontSize: '0.78rem', color: T.muted }}>No label</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
