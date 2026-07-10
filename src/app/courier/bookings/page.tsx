'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, RefreshCw, ChevronRight, FileText, Printer, CheckCircle, Clock, Truck, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
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

export default function BookingsList() {
    const { toast } = useToast();
    const [shipments, setShipments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchShipments = () => {
        setLoading(true);
        const params = new URLSearchParams({
            page: page.toString(),
            status,
            search,
            limit: '15',
        });

        fetch(`/api/courier/bookings?${params}`)
            .then(r => r.json())
            .then(data => {
                if (data.shipments) setShipments(data.shipments);
                if (data.pages) setTotalPages(data.pages);
                setLoading(false);
            })
            .catch(() => { setLoading(false); toast('error', 'Failed to load data'); });
    };

    useEffect(() => {
        fetchShipments();
    }, [page, status]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchShipments();
    };

    const handleTrackNow = async (trackingNumber: string) => {
        if (!trackingNumber) return;
        toast('info', `Requesting tracking sync for ${trackingNumber}...`);
        try {
            const res = await fetch('/api/courier/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trackingNumber }),
            });
            if (res.ok) {
                fetchShipments();
            }
        } catch (e) {
            console.error(e);
            toast('error', 'Failed to sync tracking');
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
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Booked Consignments</h1>
                    <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">Manage active courier labels, loadsheets, and delivery milestones.</p>
                </div>
            </div>

            {/* Filters bar */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }} className="bns-toolbar">
                <form onSubmit={handleSearch} style={{ display: 'flex', flex: 1, gap: '8px', minWidth: '300px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={16} color={T.muted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Search tracking, recipient, city..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '10px 16px 10px 36px', borderRadius: '8px', border: `1px solid ${T.border}`, fontSize: '0.875rem', outline: 'none' }}
                        />
                    </div>
                    <button type="submit" style={{ padding: '10px 20px', background: T.accent, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                        Search
                    </button>
                </form>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {['all', 'booked', 'in_transit', 'delivered', 'returned'].map((t) => (
                        <button
                            key={t}
                            onClick={() => { setStatus(t); setPage(1); }}
                            style={{
                                padding: '8px 16px',
                                border: `1px solid ${status === t ? T.accent : T.border}`,
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                textTransform: 'capitalize',
                                background: status === t ? T.accentLight : '#fff',
                                color: status === t ? T.accent : T.muted,
                                cursor: 'pointer',
                            }}
                        >
                            {t.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Shipment Table */}
            <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: T.muted }}>
                        <RefreshCw size={24} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 12px' }} />
                        <span>Loading shipments...</span>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }} className="bns-table-wrap">
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.card, color: T.muted }}>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Consignment CN</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Recipient</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Destination</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>COD Amount</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500 }}>Service Status</th>
                                    <th style={{ padding: '14px 20px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shipments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: T.muted }}>No shipments matched your search criteria.</td>
                                    </tr>
                                ) : (
                                    shipments.map((s, idx) => (
                                        <tr key={s.id || idx} style={{ borderBottom: idx === shipments.length - 1 ? 'none' : `1px solid ${T.border}` }}>
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 700, color: T.accent }}>{s.trackingNumber || 'PENDING'}</span>
                                                    <span style={{ fontSize: '0.75rem', color: T.muted }}>TCS Express</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600 }}>{s.recipientName}</span>
                                                    <span style={{ fontSize: '0.75rem', color: T.muted }}>{s.recipientPhone}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>{s.recipientCity}</td>
                                            <td style={{ padding: '16px 20px', fontWeight: 600 }}>PKR {s.codAmount?.toString() || '0'}</td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {s.status === 'delivered' ? <CheckCircle size={14} color="#10b981" /> : s.status === 'returned' ? <ShieldAlert size={14} color="#ef4444" /> : <Clock size={14} color="#f59e0b" />}
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: s.status === 'delivered' ? '#10b981' : s.status === 'returned' ? '#ef4444' : '#f59e0b',
                                                        textTransform: 'uppercase',
                                                    }}>{s.status}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => handleTrackNow(s.trackingNumber)} style={{ background: 'none', border: `1px solid ${T.border}`, padding: '6px 12px', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer' }}>
                                                        Track Sync
                                                    </button>
                                                    {s.labelUrl && (
                                                        <a href={s.labelUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: `1px solid ${T.border}`, padding: '6px 12px', borderRadius: '4px', fontSize: '0.78rem', color: T.fg, textDecoration: 'none' }}>
                                                            <Printer size={12} />
                                                            <span>Label</span>
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                    {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setPage(i + 1)}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                border: `1px solid ${page === i + 1 ? T.accent : T.border}`,
                                background: page === i + 1 ? T.accentLight : '#fff',
                                color: page === i + 1 ? T.accent : T.muted,
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                            }}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
