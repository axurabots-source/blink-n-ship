'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2, AlertTriangle,
    CheckSquare, Square, Search, Printer, X, Package,
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
        setSelected(allSelected ? new Set() : new Set(visible));
    }

    const filtered = orders.filter((o) => {
        const q = search.toLowerCase();
        return !q || o.customerName?.toLowerCase().includes(q) || o.trackingNumber?.toLowerCase().includes(q) || o.city?.toLowerCase().includes(q);
    });

    async function handleGenerateLabel() {
        const cns = Array.from(selected).map((id) => orders.find((o) => o.id === id)?.trackingNumber).filter(Boolean) as string[];
        if (!cns.length) { setError('No tracking numbers to generate labels for.'); return; }
        // Open blank popup synchronously (during user gesture — not blocked on mobile)
        const popup = window.open('', '_blank');
        setGeneratingLabel(true); setError('');
        try {
            const res = await fetch('/api/courier/labels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cns }),
            });
            if (!res.ok) { const b = await res.json(); throw new Error(b.error || 'Label generation failed'); }
            const contentType = res.headers.get('content-type') || '';
            let url: string | null = null;
            if (contentType.includes('application/pdf')) {
                const blob = await res.blob();
                url = URL.createObjectURL(blob);
            } else {
                const body = await res.json();
                url = body.labelUrl || null;
            }
            if (url) {
                if (popup && !popup.closed) {
                    popup.location.href = url;
                } else {
                    window.location.href = url;
                }
                if (contentType.includes('application/pdf')) {
                    setTimeout(() => URL.revokeObjectURL(url!), 60000);
                }
            }
        } catch (err: any) { setError(err.message); }
        finally { setGeneratingLabel(false); }
    }

    const printBtnDisabled = selected.size === 0 || generatingLabel;

    return (
        <>
            <style>{`
                /* ── Base page ─────────────────────────────── */
                .bns-shipments {
                    min-height: 100vh;
                    background: ${T.bg};
                    padding: 40px 48px;
                    font-family: var(--font-geist-sans), sans-serif;
                    box-sizing: border-box;
                }

                /* ── Toolbar ───────────────────────────────── */
                .bns-toolbar {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }
                .bns-search-wrap {
                    position: relative;
                    flex: 1 1 220px;
                }
                .bns-search-wrap svg {
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: ${T.muted};
                    pointer-events: none;
                }
                .bns-search-input {
                    width: 100%;
                    border: 1px solid ${T.border};
                    border-radius: 8px;
                    padding: 8px 10px 8px 32px;
                    font-size: 16px;
                    color: ${T.fg};
                    outline: none;
                    box-sizing: border-box;
                    background: ${T.card};
                }
                .bns-print-btn {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    border: none;
                    border-radius: 8px;
                    padding: 9px 18px;
                    font-size: 0.82rem;
                    font-weight: 600;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: background 0.2s;
                }

                /* ── Desktop table ─────────────────────────── */
                .bns-table-wrap { display: block; }
                .bns-cards-wrap  { display: none; }

                /* ── Mobile card ────────────────────────────── */
                .bns-card {
                    border: 1.5px solid ${T.border};
                    border-radius: 12px;
                    padding: 14px 16px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: border-color 0.18s, background 0.18s;
                    position: relative;
                    background: ${T.bg};
                }
                .bns-card.selected {
                    border-color: ${T.accent};
                    background: #fffbf8;
                }
                .bns-card-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                }
                .bns-card-check {
                    margin-top: 2px;
                    flex-shrink: 0;
                    color: ${T.muted};
                }
                .bns-card-check.active { color: ${T.accent}; }
                .bns-card-body { flex: 1; min-width: 0; }
                .bns-card-name {
                    font-size: 0.88rem;
                    font-weight: 700;
                    color: ${T.fg};
                    margin-bottom: 6px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .bns-card-meta {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px 16px;
                    font-size: 0.76rem;
                    color: ${T.muted};
                    margin-bottom: 8px;
                }
                .bns-card-meta span { display: flex; align-items: center; gap: 3px; }
                .bns-tracking-badge {
                    display: inline-block;
                    background: ${T.greenLight};
                    border: 1px solid #bbf7d0;
                    border-radius: 6px;
                    padding: 2px 10px;
                    font-size: 0.73rem;
                    font-weight: 700;
                    color: ${T.green};
                    font-family: var(--font-geist-mono);
                }
                .bns-tracking-pending {
                    display: inline-block;
                    font-size: 0.73rem;
                    color: #d97706;
                    background: #fffbeb;
                    border: 1px solid #fef3c7;
                    border-radius: 6px;
                    padding: 2px 8px;
                    font-weight: 600;
                }
                .bns-cod-badge {
                    font-size: 0.76rem;
                    font-weight: 700;
                    color: ${T.accent};
                }

                /* ── Mobile FAB print button ────────────────── */
                .bns-fab {
                    display: none;
                }

                /* ── Responsive breakpoint ─────────────────── */
                @media (max-width: 768px) {
                    .bns-shipments {
                        padding: 20px 16px 100px; /* bottom pad for FAB */
                    }
                    .bns-table-wrap { display: none; }
                    .bns-cards-wrap  { display: block; }

                    .bns-toolbar {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 10px;
                    }
                    .bns-search-wrap { flex: unset; width: 100%; }
                    .bns-toolbar-right {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                    /* Hide desktop print btn on mobile (FAB replaces it) */
                    .bns-print-desktop { display: none !important; }

                    /* FAB bar at bottom */
                    .bns-fab {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        position: fixed;
                        bottom: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        z-index: 50;
                        border: none;
                        border-radius: 50px;
                        padding: 14px 28px;
                        font-size: 0.9rem;
                        font-weight: 700;
                        box-shadow: 0 8px 28px rgba(204,120,92,0.38);
                        cursor: pointer;
                        white-space: nowrap;
                        min-width: 200px;
                        transition: background 0.2s, box-shadow 0.2s;
                    }
                    .bns-select-all-mobile {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        font-size: 0.78rem;
                        font-weight: 600;
                        color: ${T.muted};
                        background: none;
                        border: none;
                        cursor: pointer;
                        padding: 0;
                    }
                }
                @media (min-width: 769px) {
                    .bns-select-all-mobile { display: none; }
                }
            `}</style>

            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="bns-shipments"
            >
                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: T.fg, margin: 0 }}>Shipments</h1>
                    <p style={{ color: T.muted, fontSize: '0.875rem', margin: '4px 0 0' }}>Print labels for your booked orders.</p>
                </div>

                {/* Error Banner */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: '0.85rem', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            <AlertTriangle size={14} /><span>{error}</span>
                            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><X size={14} /></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Toolbar */}
                <div className="bns-toolbar">
                    <div className="bns-search-wrap">
                        <Search size={14} />
                        <input
                            className="bns-search-input"
                            value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, tracking, city…"
                        />
                    </div>

                    <div className="bns-toolbar-right">
                        {/* Select-all (mobile only) */}
                        <button className="bns-select-all-mobile" onClick={toggleAll}>
                            {filtered.length > 0 && filtered.every((o) => selected.has(o.id))
                                ? <><CheckSquare size={15} style={{ color: T.accent }} /> Deselect all</>
                                : <><Square size={15} /> Select all</>}
                        </button>

                        {selected.size > 0 && (
                            <span style={{ fontSize: '0.78rem', color: T.muted, fontWeight: 500 }}>{selected.size} selected</span>
                        )}

                        {/* Desktop print button */}
                        <motion.button
                            className="bns-print-btn bns-print-desktop"
                            onClick={handleGenerateLabel}
                            disabled={printBtnDisabled}
                            whileHover={{ scale: printBtnDisabled ? 1 : 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            style={{ background: printBtnDisabled ? '#e5e5e5' : T.accent, color: printBtnDisabled ? T.muted : '#fff' }}
                        >
                            {generatingLabel ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
                            Print Labels ({selected.size})
                        </motion.button>
                    </div>
                </div>

                {/* ── DESKTOP TABLE ─────────────────────────────── */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: T.muted }}>
                        <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block' }} />
                        Loading shipments…
                    </div>
                ) : (
                    <>
                        <div className="bns-table-wrap" style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
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
                                                        ? <span className="bns-tracking-badge">{o.trackingNumber}</span>
                                                        : <span className="bns-tracking-pending">Awaiting from courier</span>}
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
                            {filtered.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted, fontSize: '0.9rem' }}>
                                    {search ? 'No results for your search.' : 'No booked shipments yet. Book orders from the Orders page.'}
                                </div>
                            )}
                        </div>

                        {/* ── MOBILE CARDS ─────────────────────────────── */}
                        <div className="bns-cards-wrap">
                            {filtered.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
                                    <Package size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                        {search ? 'No results for your search.' : 'No booked shipments yet.'}
                                    </p>
                                </div>
                            ) : (
                                filtered.map((o) => (
                                    <motion.div
                                        key={o.id}
                                        className={`bns-card${selected.has(o.id) ? ' selected' : ''}`}
                                        onClick={() => toggleSelect(o.id)}
                                        whileTap={{ scale: 0.985 }}
                                    >
                                        <div className="bns-card-row">
                                            {/* Checkbox */}
                                            <div className={`bns-card-check${selected.has(o.id) ? ' active' : ''}`}>
                                                {selected.has(o.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </div>

                                            <div className="bns-card-body">
                                                {/* Customer name */}
                                                <div className="bns-card-name">{o.customerName || 'Unknown Customer'}</div>

                                                {/* Tracking badge */}
                                                <div style={{ marginBottom: 8 }}>
                                                    {o.trackingNumber
                                                        ? <span className="bns-tracking-badge">{o.trackingNumber}</span>
                                                        : <span className="bns-tracking-pending">Awaiting from courier</span>}
                                                </div>

                                                {/* Meta row */}
                                                <div className="bns-card-meta">
                                                    {o.city && <span>📍 {o.city}</span>}
                                                    {o.courierProvider && <span>🚚 {o.courierProvider}</span>}
                                                    {o.bookedAt && (
                                                        <span>🕐 {new Date(o.bookedAt).toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* COD amount */}
                                            {o.sellingPrice && (
                                                <div className="bns-cod-badge">
                                                    Rs {Number(o.sellingPrice).toLocaleString('en-PK')}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </motion.div>

            {/* ── MOBILE FAB Print Button ───────────────────────── */}
            <AnimatePresence>
                {selected.size > 0 && (
                    <motion.button
                        className="bns-fab"
                        onClick={handleGenerateLabel}
                        disabled={generatingLabel}
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        transition={{ duration: 0.22 }}
                        style={{ background: generatingLabel ? '#e5e5e5' : T.accent, color: generatingLabel ? T.muted : '#fff' }}
                    >
                        {generatingLabel ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                        Print {selected.size} Label{selected.size > 1 ? 's' : ''}
                    </motion.button>
                )}
            </AnimatePresence>
        </>
    );
}
