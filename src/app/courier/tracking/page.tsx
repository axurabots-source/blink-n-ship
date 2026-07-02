'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Calendar, Clock, RefreshCw, AlertCircle, ArrowUpRight } from 'lucide-react';

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

export default function ShipmentTracking() {
    const [trackingNumber, setTrackingNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [trackingData, setTrackingData] = useState<any>(null);

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!trackingNumber.trim()) return;

        setLoading(true);
        setError(null);
        setTrackingData(null);

        try {
            const res = await fetch(`/api/courier/track/${trackingNumber.trim()}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Tracking record not found');
            
            // If timeline is empty, request tracking update from Flaship API
            if (!data.timeline || data.timeline.length === 0) {
                const liveRes = await fetch('/api/courier/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trackingNumber: trackingNumber.trim() }),
                });
                const liveData = await liveRes.json();
                if (liveRes.ok && liveData.tracking) {
                    setTrackingData({
                        shipment: liveData.tracking,
                        timeline: liveData.tracking.history.map((h: any) => ({
                            status: h.status,
                            description: h.description,
                            location: h.location,
                            occurredAt: h.occurred_at,
                        })),
                    });
                    return;
                }
            }

            setTrackingData(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
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
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Consignment Tracking Timeline</h1>
                <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">Live tracking lookup connecting with Flaship Peru Gateway.</p>
            </div>

            {/* Tracking Search Input */}
            <div style={{ maxWidth: '600px', marginBottom: '40px' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="Enter tracking number (e.g. FLP-100456)"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: `1px solid ${T.border}`, fontSize: '0.875rem', outline: 'none' }}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !trackingNumber.trim()}
                        style={{ padding: '12px 24px', background: T.accent, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : <span>Track Shipment</span>}
                    </button>
                </form>

                {error && (
                    <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', color: '#ef4444', fontSize: '0.8rem', marginTop: '16px' }}>
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Tracking Result Timeline */}
            {trackingData && (
                <div style={{ maxWidth: '800px' }}>
                    {/* Header Summary */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.card, border: `1px solid ${T.border}`, padding: '20px 24px', borderRadius: '12px 12px 0 0' }}>
                        <div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>Shipment CN</span>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: T.accent, marginTop: '4px' }}>{trackingData.shipment?.trackingNumber || trackingNumber}</h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>Status</span>
                            <div style={{
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                background: T.accentLight,
                                color: T.accent,
                                padding: '4px 10px',
                                borderRadius: '20px',
                                marginTop: '4px',
                                display: 'inline-block',
                                textTransform: 'uppercase',
                            }}>
                                {trackingData.shipment?.status || 'Active'}
                            </div>
                        </div>
                    </div>

                    {/* Timeline Body */}
                    <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderTop: 'none', padding: '32px 24px', borderRadius: '0 0 12px 12px' }}>
                        {(!trackingData.timeline || trackingData.timeline.length === 0) ? (
                            <div style={{ textAlign: 'center', color: T.muted, padding: '24px' }}>No timeline checkpoints recorded yet.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', paddingLeft: '24px' }}>
                                {/* Vertical line */}
                                <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '10px', width: '2px', background: T.border }} />

                                {trackingData.timeline.map((event: any, idx: number) => (
                                    <div key={idx} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                                        {/* Timeline Dot */}
                                        <div style={{
                                            position: 'absolute',
                                            left: '-23px',
                                            top: '4px',
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            background: idx === trackingData.timeline.length - 1 ? T.accent : '#fff',
                                            border: `2px solid ${T.accent}`,
                                            zIndex: 2,
                                        }} />

                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'capitalize' }}>{event.status.replace('_', ' ')}</h4>
                                                <span style={{ fontSize: '0.75rem', color: T.muted }}>{new Date(event.occurredAt).toLocaleString()}</span>
                                            </div>
                                            <p style={{ fontSize: '0.85rem', color: T.muted, marginBottom: '6px' }}>{event.description}</p>
                                            {event.location && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: T.muted }}>
                                                    <MapPin size={12} />
                                                    <span>{event.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
