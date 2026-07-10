'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Printer, RefreshCw, CheckCircle, Clock } from 'lucide-react';
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

export default function CourierLoadsheets() {
    const { toast } = useToast();
    const [loadsheets, setLoadsheets] = useState<any[]>([]);
    const [eligible, setEligible] = useState<any[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const loadData = () => {
        setLoading(true);
        fetch('/api/courier/loadsheets')
            .then(r => r.json())
            .then(data => {
                if (data.loadsheets) setLoadsheets(data.loadsheets);
                if (data.eligibleShipments) setEligible(data.eligibleShipments);
                setLoading(false);
            })
            .catch(() => { setLoading(false); toast('error', 'Failed to load data'); });
    };

    useEffect(() => {
        loadData();
    }, []);

    const toggleEligible = (id: string) => {
        setSelected(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleCreateLoadsheet = async () => {
        if (selected.length === 0) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/courier/loadsheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shipmentIds: selected }),
            });
            if (res.ok) {
                toast('success', 'Loadsheet generated successfully');
                setSelected([]);
                loadData();
            }
        } catch (e) {
            toast('error', 'Failed to generate loadsheet');
        } finally {
            setSubmitting(false);
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
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Courier Loadsheets</h1>
                <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">Manage loadsheet generation and submission for courier rider pick-ups.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }} className="bns-grid">
                {/* Eligible shipments */}
                <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Unassigned Booked Orders</h3>
                        {selected.length > 0 && (
                            <button
                                onClick={handleCreateLoadsheet}
                                disabled={submitting}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: T.accent, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                                <span>Create Loadsheet ({selected.length})</span>
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div style={{ padding: '20px', color: T.muted }}>Loading shipments...</div>
                    ) : eligible.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: T.muted, fontSize: '0.85rem' }}>All booked shipments are assigned to loadsheets.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {eligible.map((s) => {
                                const isSel = selected.includes(s.id);
                                return (
                                    <div
                                        key={s.id}
                                        onClick={() => toggleEligible(s.id)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: `1px solid ${isSel ? T.accent : T.border}`, background: isSel ? T.accentLight : '#fff', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s ease' }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{s.trackingNumber}</span>
                                            <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: T.muted, marginTop: '2px' }}>
                                                <span>{s.recipientName}</span>
                                                <span>•</span>
                                                <span>{s.recipientCity}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Loadsheet History */}
                <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px' }}>Loadsheet History</h3>

                    {loading ? (
                        <div style={{ padding: '20px', color: T.muted }}>Loading loadsheets...</div>
                    ) : loadsheets.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: T.muted, fontSize: '0.85rem' }}>No loadsheets generated yet.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {loadsheets.map((l) => (
                                <div key={l.id} style={{ border: `1px solid ${T.border}`, padding: '16px', borderRadius: '8px', background: T.card }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{l.externalId || 'Loadsheet'}</span>
                                        <span style={{ fontSize: '0.75rem', color: T.muted }}>{new Date(l.generatedAt).toLocaleDateString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: T.muted }}>
                                        <span>{l.orderCount} consignments</span>
                                        {l.loadsheetUrl && (
                                            <a href={l.loadsheetUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: T.accent, textDecoration: 'none', fontWeight: 600 }}>
                                                <Printer size={12} />
                                                <span>Print</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
