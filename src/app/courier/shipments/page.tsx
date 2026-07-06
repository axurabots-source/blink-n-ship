'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Loader2, AlertTriangle,
    CheckSquare, Square, Search, Printer, X,
} from 'lucide-react';

const T = {
    bg: '#ffffff', fg: '#0a0a0a', accent: '#CC785C', border: '#e5e5e5',
    muted: '#737373', card: '#fafafa', green: '#16a34a', greenLight: '#f0fdf4',
};

type BookedOrder = {
    id: string;
    trackingNumber: string | null;
    customerName: string | null;
    city: string | null;
    courierProvider: string | null;
    sellingPrice: string | null;
    bookedAt: string | null;
    labelUrl: string | null;
    status: string;
};

export default function ShipmentsPage() {
    const [orders, setOrders] = useState<BookedOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [generatingLabel, setGeneratingLabel] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Load from memory cache instantly
        const cache = (window as any).__BNS_CACHE__;
        if (cache && cache.shipments) {
            setOrders(cache.shipments);
            setLoading(false);
        }
        fetchOrders();
    }, []);

    async function fetchOrders() {
        try {
            const res = await fetch('/api/orders');
            const body = await res.json();
            const booked = (body.orders || []).filter((o: any) => o.status === 'booked');
            setOrders(booked);

            // Update cache
            if (!(window as any).__BNS_CACHE__) (window as any).__BNS_CACHE__ = {};
            (window as any).__BNS_CACHE__.shipments = booked;
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }


    function toggleSelect(id: string) {
        setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }

    function toggleAll() {
        const visible = filtered.map((o) => o.id);
        const allSelected = visible.every((id) => selected.has(id));
        if (allSelected) setSelected(new Set());
        else setSelected(new Set(visible));
    }

    const filtered = orders.filter((o) => {
        const q = search.toLowerCase();
        return !q || o.customerName?.toLowerCase().includes(q) || o.trackingNumber?.toLowerCase().includes(q) || o.city?.toLowerCase().includes(q);
    });

    async function handleGenerateLabel() {
        const cns = Array.from(selected).map((id) => orders.find((o) => o.id === id)?.trackingNumber).filter(Boolean) as string[];
        if (!cns.length) { setError('No tracking numbers to generate labels for.'); return; }
        setGeneratingLabel(true); setError('');
        try {
            const res = await fetch('/api/courier/labels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cns }),
            });
            if (!res.ok) { const b = await res.json(); throw new Error(b.error || 'Label generation failed'); }
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/pdf')) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            } else {
                const body = await res.json();
                if (body.labelUrl) window.open(body.labelUrl, '_blank');
            }
        } catch (err: any) { setError(err.message); }
        finally { setGeneratingLabel(false); }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ minHeight: '100vh', background: T.bg, padding: '40px 48px', fontFamily: 'var(--font-geist-sans), sans-serif', boxSizing: 'border-box' }}
            className="bns-page"
        >
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: T.fg, margin: 0 }}>Shipments</h1>
                <p style={{ color: T.muted, fontSize: '0.875rem', margin: '4px 0 0' }}>Print labels for your booked orders.</p>
            </div>

            {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: '0.85rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={14} /><span>{error}</span>
                    <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><X size={14} /></button>
                </div>
            )}

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 220px' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
                    <input
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, tracking, city..."
                        style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px 8px 32px', fontSize: '0.85rem', color: T.fg, outline: 'none', boxSizing: 'border-box' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {selected.size > 0 && (
                        <span style={{ fontSize: '0.78rem', color: T.muted, fontWeight: 500 }}>{selected.size} selected</span>
                    )}

                    <motion.button
                        onClick={handleGenerateLabel}
                        disabled={selected.size === 0 || generatingLabel}
                        whileHover={{ scale: selected.size === 0 || generatingLabel ? 1 : 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, background: selected.size === 0 || generatingLabel ? '#e5e5e5' : T.accent, color: selected.size === 0 || generatingLabel ? T.muted : '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.82rem', fontWeight: 600, cursor: selected.size === 0 || generatingLabel ? 'not-allowed' : 'pointer' }}
                    >
                        {generatingLabel ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
                        Print Labels ({selected.size})
                    </motion.button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: T.muted }}><Loader2 size={24} className="animate-spin" style={{ margin: '0 auto', display: 'block', marginBottom: 10 }} /> Loading shipments...</div>
            ) : (
                <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.card }}>
                                    <th style={{ padding: '10px 16px', width: 40 }}>
                                        <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: filtered.length > 0 && filtered.every((o) => selected.has(o.id)) ? T.accent : '#d4d4d4' }}>
                                            {filtered.length > 0 && filtered.every((o) => selected.has(o.id)) ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </button>
                                    </th>
                                    {['Tracking ID', 'Customer', 'City', 'Courier', 'COD', 'Booked At'].map((h) => (
                                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: T.muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((o) => (
                                    <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0', background: selected.has(o.id) ? '#fffbf8' : 'transparent' }}>
                                        <td style={{ padding: '8px 12px' }}>
                                            <button onClick={() => toggleSelect(o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: selected.has(o.id) ? T.accent : '#d4d4d4' }}>
                                                {selected.has(o.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </button>
                                        </td>
                                        <td style={{ padding: '8px 16px' }}>
                                            {o.trackingNumber
                                                ? <span style={{ background: T.greenLight, border: '1px solid #bbf7d0', borderRadius: 6, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 700, color: T.green, fontFamily: 'var(--font-geist-mono)' }}>{o.trackingNumber}</span>
                                                : <span style={{ fontSize: '0.76rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>Awaiting from courier</span>
                                            }
                                        </td>
                                        <td style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 500, color: T.fg }}>{o.customerName || '—'}</td>
                                        <td style={{ padding: '8px 16px', fontSize: '0.82rem', color: T.muted }}>{o.city || '—'}</td>
                                        <td style={{ padding: '8px 16px', fontSize: '0.8rem', color: T.muted }}>{o.courierProvider || '—'}</td>
                                        <td style={{ padding: '8px 16px', fontSize: '0.82rem', color: T.fg }}>{o.sellingPrice ? `Rs ${Number(o.sellingPrice).toLocaleString('en-PK')}` : '—'}</td>
                                        <td style={{ padding: '8px 16px', fontSize: '0.78rem', color: T.muted }}>{o.bookedAt ? new Date(o.bookedAt).toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filtered.length === 0 && !loading && (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted, fontSize: '0.9rem' }}>
                            {search ? 'No results for your search.' : 'No booked shipments yet. Book orders from the Orders page.'}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
