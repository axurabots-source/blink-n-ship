'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2,
    CheckSquare,
    Square,
    ChevronDown,
    ChevronUp,
    Sparkles,
    PackageCheck,
    Trash2,
    AlertTriangle,
    Undo,
    Edit2,
    Check,
    X,
    Filter,
} from 'lucide-react';

type Order = {
    id: string;
    customerName: string | null;
    phoneNumber: string | null;
    address: string | null;
    city: string | null;
    productInfo: string | null;
    productId: string | null;
    quantity: number;
    costPrice: string | null;
    sellingPrice: string | null;
    profit: string | null;
    status: string;
    trackingNumber: string | null;
    weight: string | null;
    shippingType: string | null;
    createdAt: string;
    bookedAt: string | null;
};

type Product = {
    id: string;
    name: string;
    costPrice: string;
    stockQuantity: number;
    weight: string;
};

type Profile = {
    id: string;
    accountType: 'inventory_holder' | 'reseller';
    businessName: string | null;
};

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

const getShippingTypeFromWeight = (w: number) => {
    if (w > 3) return 'Overland';
    if (w > 1) return 'Detain';
    return 'Overnight';
};

const isPhoneInvalid = (phone: string | null) => {
    if (!phone) return true;
    const digits = phone.replace(/\D/g, '');
    return digits.length !== 11;
};

export default function OrdersPage() {
    const [rawText, setRawText] = useState('');
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
    const [selectedBooked, setSelectedBooked] = useState<Set<string>>(new Set());
    const [expandedDrafts, setExpandedDrafts] = useState<Set<string>>(new Set());
    
    // Inline editing booked orders state
    const [editingBookedId, setEditingBookedId] = useState<string | null>(null);
    const [editBookedForm, setEditBookedForm] = useState<Partial<Order>>({});
    
    const [savingEdit, setSavingEdit] = useState(false);

    const [extracting, setExtracting] = useState(false);
    const [booking, setBooking] = useState(false);
    const [unbooking, setUnbooking] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());

    // Animated delete confirmation state
    const [deletingTarget, setDeletingTarget] = useState<string | null>(null);
    const [deleteProgress, setDeleteProgress] = useState<number | null>(null);
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

    // Unbook animation state
    const [unbookingId, setUnbookingId] = useState<string | null>(null);
    const [unbookProgress, setUnbookProgress] = useState<number | null>(null);

    // Navigation tabs
    const [activeTab, setActiveTab] = useState<'drafts' | 'booked'>('drafts');

    useEffect(() => {
        refresh();
        loadProducts();
    }, []);

    async function refresh() {
        try {
            const res = await fetch('/api/orders');
            const body = await res.json();
            setOrders(body.orders || []);
            if (body.profile) setProfile(body.profile);
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function loadProducts() {
        const res = await fetch('/api/products');
        const body = await res.json();
        setProducts(body.products || []);
    }

    async function handleExtract() {
        if (!rawText.trim()) return;
        setExtracting(true);
        setError('');
        try {
            const res = await fetch('/api/orders/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw_text: rawText }),
            });
            if (!res.ok) {
                const b = await res.json();
                throw new Error(b.error || 'Extraction failed');
            }
            setRawText('');
            await refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setExtracting(false);
        }
    }

    function editLocal(orderId: string, field: keyof Order, value: any) {
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, [field]: value } : o));
    }

    async function saveFieldsBatch(orderId: string, updatesObj: Record<string, any>) {
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatesObj),
            });
            if (!res.ok) {
                throw new Error('Failed to update order');
            }
            if ('productId' in updatesObj && updatesObj.productId) {
                setValidationErrors((prev) => {
                    const next = new Set(prev);
                    next.delete(orderId);
                    return next;
                });
            }
            refresh();
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function saveField(orderId: string, field: string, value: any) {
        saveFieldsBatch(orderId, { [field]: value });
    }

    function handleProductSelect(orderId: string, productId: string) {
        const product = products.find((p) => p.id === productId);
        if (product) {
            const costPriceVal = parseFloat(product.costPrice) || 0;
            const weightVal = parseFloat(product.weight) || 0;
            const shippingVal = getShippingTypeFromWeight(weightVal);

            const updates = {
                productId,
                costPrice: costPriceVal,
                weight: weightVal,
                shippingType: shippingVal,
            };

            setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...updates, costPrice: product.costPrice, weight: product.weight } : o));
            saveFieldsBatch(orderId, updates);
        } else {
            const updates = { productId: null };
            setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, productId: null } : o));
            saveFieldsBatch(orderId, updates);
        }
    }

    function handleWeightChange(orderId: string, weightStr: string) {
        const w = parseFloat(weightStr) || 0;
        const suggestedShipping = getShippingTypeFromWeight(w);

        const updates = { weight: w, shippingType: suggestedShipping };
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, weight: weightStr, shippingType: suggestedShipping } : o));
        saveFieldsBatch(orderId, updates);
    }

    // Toggle expands
    function toggleExpand(id: string) {
        setExpandedDrafts((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    // Draft checkboxes
    function toggleSelectDraft(id: string) {
        setSelectedDrafts((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    // Booked checkboxes
    function toggleSelectBooked(id: string) {
        setSelectedBooked((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    const draftOrders = orders.filter((o) => o.status === 'draft');
    const bookedOrders = orders.filter((o) => o.status === 'booked');

    // Bulk selection logic
    function handleBulkSelectDraft(type: 'all' | 'none' | 'valid') {
        if (type === 'none') {
            setSelectedDrafts(new Set());
        } else if (type === 'all') {
            setSelectedDrafts(new Set(draftOrders.map((o) => o.id)));
        } else if (type === 'valid') {
            const valids = draftOrders.filter((o) => !isPhoneInvalid(o.phoneNumber)).map((o) => o.id);
            setSelectedDrafts(new Set(valids));
        }
    }

    // Bulk delete drafts — now uses animated confirm modal
    async function handleDeleteSelectedDrafts() {
        if (selectedDrafts.size === 0) return;
        setDeletingTarget('bulk-draft');
        setDeleteProgress(null);
    }

    async function executeDeleteDrafts() {
        let current = 0;
        const interval = setInterval(() => {
            current += 4;
            setDeleteProgress(current);
            if (current >= 100) {
                clearInterval(interval);
                performDeleteDrafts();
            }
        }, 25);
    }

    async function performDeleteDrafts() {
        setDeleting(true);
        setError('');
        try {
            const ids = deletingTarget === 'bulk-draft'
                ? Array.from(selectedDrafts)
                : deletingTarget ? [deletingTarget] : [];
            for (const id of ids) {
                await fetch(`/api/orders/${id}`, { method: 'DELETE' });
            }
            setSelectedDrafts(new Set());
            await refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setDeleting(false);
            setDeletingTarget(null);
            setDeleteProgress(null);
        }
    }

    // Book selected drafts
    async function handleBookSelected() {
        if (selectedDrafts.size === 0) return;

        // Perform validation
        const invalidOrders = new Set<string>();
        const hasInvalidPhone = Array.from(selectedDrafts).some((id) => {
            const ord = draftOrders.find((o) => o.id === id);
            return ord && isPhoneInvalid(ord.phoneNumber);
        });

        if (hasInvalidPhone) {
            setError('Please uncheck or fix orders with invalid numbers before booking.');
            return;
        }

        if (profile?.accountType === 'inventory_holder') {
            selectedDrafts.forEach((id) => {
                const ord = draftOrders.find((o) => o.id === id);
                if (ord && !ord.productId) {
                    invalidOrders.add(id);
                }
            });
        }

        if (invalidOrders.size > 0) {
            setValidationErrors(invalidOrders);
            // Auto expand validation failed drafts
            setExpandedDrafts((prev) => {
                const next = new Set(prev);
                invalidOrders.forEach((id) => next.add(id));
                return next;
            });
            setError('Inventory Holders must select a product for all booked orders.');
            return;
        }

        setBooking(true);
        setError('');
        try {
            const res = await fetch('/api/orders/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_ids: Array.from(selectedDrafts) }),
            });
            const body = await res.json();
            const failed = body.results?.filter((r: any) => !r.success) ?? [];
            if (failed.length > 0) {
                setError(`${failed.length} order(s) failed: ${failed[0].error}`);
            }
            setSelectedDrafts(new Set());
            await refresh();
            await loadProducts();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBooking(false);
        }
    }

    // Unbook single booked order — animated
    function handleUnbook(id: string) {
        setUnbookingId(id);
        setUnbookProgress(null);
    }

    async function executeUnbook() {
        if (!unbookingId) return;
        const targetId = unbookingId;
        let current = 0;
        const interval = setInterval(() => {
            current += 5;
            setUnbookProgress(current);
            if (current >= 100) {
                clearInterval(interval);
                performUnbook(targetId);
            }
        }, 20);
    }

    async function performUnbook(id: string) {
        setUnbooking(true);
        setError('');
        try {
            const res = await fetch(`/api/orders/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'draft' }),
            });
            if (!res.ok) throw new Error('Failed to unbook shipment');
            await refresh();
            await loadProducts();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUnbooking(false);
            setUnbookingId(null);
            setUnbookProgress(null);
        }
    }

    // Bulk unbook selected
    async function handleUnbookSelected() {
        if (selectedBooked.size === 0) return;
        setUnbooking(true);
        setError('');
        try {
            const res = await fetch('/api/orders/book', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_ids: Array.from(selectedBooked) }),
            });
            if (!res.ok) throw new Error('Bulk unbook failed');
            setSelectedBooked(new Set());
            await refresh();
            await loadProducts();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUnbooking(false);
        }
    }

    // Inline edit booked row handlers
    function startEditBooked(order: Order) {
        setEditingBookedId(order.id);
        setEditBookedForm({ ...order });
    }

    async function saveInlineEditBooked() {
        if (!editingBookedId) return;
        setSavingEdit(true);
        try {
            const res = await fetch(`/api/orders/${editingBookedId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerName: editBookedForm.customerName,
                    city: editBookedForm.city,
                    weight: parseFloat(editBookedForm.weight || '0') || 0,
                    shippingType: editBookedForm.shippingType,
                    sellingPrice: parseFloat(editBookedForm.sellingPrice || '0') || 0,
                }),
            });
            if (!res.ok) throw new Error('Save failed');
            setEditingBookedId(null);
            await refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSavingEdit(false);
        }
    }



    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{
                minHeight: '100vh',
                background: T.bg,
                padding: '40px 48px',
                fontFamily: 'var(--font-geist-sans), sans-serif',
                boxSizing: 'border-box',
            }}
            className="bns-page"
        >
            {/* Animated Delete Confirmation Modal */}
            <AnimatePresence>
                {deletingTarget && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        style={{
                            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
                            background: '#ffffff', border: '1px solid #fecaca', borderRadius: 12,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 1000,
                            padding: '20px 24px', width: '90%', maxWidth: '440px', boxSizing: 'border-box',
                        }}
                    >
                        {deleteProgress === null ? (
                            <div>
                                <h3 style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertTriangle size={16} /> Confirm Deletion
                                </h3>
                                <p style={{ fontSize: '0.8rem', color: T.muted, margin: '0 0 16px', lineHeight: 1.4 }}>
                                    {deletingTarget === 'bulk-draft'
                                        ? `Are you sure you want to delete ${selectedDrafts.size} selected draft(s)?`
                                        : 'Are you sure you want to delete this order?'}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                    <button onClick={() => { setDeletingTarget(null); setDeleteProgress(null); }}
                                        style={{ border: `1px solid ${T.border}`, background: 'transparent', padding: '6px 14px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: T.muted }}>
                                        Cancel
                                    </button>
                                    <button onClick={executeDeleteDrafts}
                                        style={{ border: 'none', background: '#dc2626', color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: T.fg, margin: '0 0 10px' }}>
                                    Deleting... {deleteProgress}%
                                </p>
                                <div style={{ width: '100%', height: 8, background: T.border, borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ width: `${deleteProgress}%`, height: '100%', background: '#dc2626', transition: 'width 0.05s linear' }} />
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Unbook Confirmation Modal */}
            <AnimatePresence>
                {unbookingId && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        style={{
                            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
                            background: '#ffffff', border: '1px solid #fed7aa', borderRadius: 12,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 1001,
                            padding: '20px 24px', width: '90%', maxWidth: '420px', boxSizing: 'border-box',
                        }}
                    >
                        {unbookProgress === null ? (
                            <div>
                                <h3 style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertTriangle size={16} /> Confirm Unbook
                                </h3>
                                <p style={{ fontSize: '0.8rem', color: T.muted, margin: '0 0 16px', lineHeight: 1.4 }}>
                                    Move this shipment back to Drafts? Stock will be restored.
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                    <button onClick={() => { setUnbookingId(null); setUnbookProgress(null); }}
                                        style={{ border: `1px solid ${T.border}`, background: 'transparent', padding: '6px 14px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: T.muted }}>
                                        Cancel
                                    </button>
                                    <button onClick={executeUnbook}
                                        style={{ border: 'none', background: '#d97706', color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                                        Unbook
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: T.fg, margin: '0 0 10px' }}>
                                    Unbooking... {unbookProgress}%
                                </p>
                                <div style={{ width: '100%', height: 8, background: T.border, borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ width: `${unbookProgress}%`, height: '100%', background: '#d97706', transition: 'width 0.02s linear' }} />
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Extracting animation overlay */}
            <AnimatePresence>
                {extracting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 20, right: 24,
                            background: '#0a0a0a', color: '#fff',
                            borderRadius: 10, padding: '10px 18px',
                            zIndex: 1000, display: 'flex', alignItems: 'center', gap: 10,
                            fontSize: '0.82rem', fontWeight: 600,
                            boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                        }}
                    >
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                            <Sparkles size={14} color="#CC785C" />
                        </motion.div>
                        Extracting orders with AI...
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: T.fg, margin: 0 }}>Order Booking</h1>
                <p style={{ color: T.muted, fontSize: '0.875rem', margin: '4px 0 0' }}>
                    Process raw messages, fill delivery details, and generate courier labels instantly.
                </p>
            </div>

            {/* Error Banner */}
            {error && (
                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#dc2626',
                    fontSize: '0.85rem',
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                </div>
            )}

            {/* Extract section — Always visible at top */}
            <div style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: 24,
                marginBottom: 24,
            }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: T.fg, display: 'block', marginBottom: 10 }}>
                    Paste customer orders / messages
                </label>
                <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste message from customer here. E.g. Name: Aisha Khan, Cell: 03215556789, Address: House 23, Block C, Gulshan, Karachi. Item: 2 lawn suits"
                    rows={4}
                    style={{
                        width: '100%',
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: '10px 14px',
                        fontSize: '0.875rem',
                        color: T.fg,
                        background: T.bg,
                        resize: 'vertical',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        lineHeight: 1.6,
                    }}
                    onFocus={(e) => e.target.style.borderColor = T.accent}
                    onBlur={(e) => e.target.style.borderColor = T.border}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 14 }}>
                    <AnimatePresence>
                        {extracting && (
                            <motion.div
                                initial={{ x: -40, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: 20, opacity: 0 }}
                                style={{ display: 'flex', gap: 5, alignItems: 'center' }}
                            >
                                {[0, 1, 2].map((i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ repeat: Infinity, delay: i * 0.15, duration: 0.5 }}
                                        style={{ width: 6, height: 6, borderRadius: '50%', background: '#CC785C' }}
                                    />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <motion.button
                        onClick={handleExtract}
                        disabled={extracting || !rawText.trim()}
                        whileHover={{ scale: extracting || !rawText.trim() ? 1 : 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: extracting || !rawText.trim() ? '#e5e5e5' : T.accent,
                            color: extracting || !rawText.trim() ? T.muted : '#fff',
                            border: 'none', borderRadius: 8, padding: '9px 20px',
                            fontSize: '0.875rem', fontWeight: 600, cursor: extracting || !rawText.trim() ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {extracting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {extracting ? 'Extracting...' : 'Process Orders'}
                    </motion.button>
                </div>
            </div>

            {/* Inventory Holder Empty Inventory Warning */}
            {profile?.accountType === 'inventory_holder' && products.length === 0 && (
                <div style={{
                    background: '#fffbf0',
                    border: '1px solid #fef3c7',
                    borderRadius: 12,
                    padding: '16px 20px',
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: '#fef3c7', padding: 8, borderRadius: '50%', color: '#d97706', display: 'flex' }}>
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 2px', fontSize: '0.9rem', fontWeight: 700, color: '#92400e' }}>
                                Inventory Required Before Booking
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#b45309' }}>
                                As an Inventory Holder, you must add products to your Inventory Catalog before booking shipments.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.href = '/products'}
                        style={{
                            background: '#d97706',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '8px 16px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Add Inventory Now →
                    </button>
                </div>
            )}

            {/* Tabs switcher — Positioned right below extract & warning */}
            <div style={{
                display: 'inline-flex',
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: '8px',
                padding: '3px',
                marginBottom: 24,
            }}>
                <button
                    onClick={() => setActiveTab('drafts')}
                    style={{
                        border: 'none',
                        padding: '7px 20px',
                        borderRadius: '6px',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: activeTab === 'drafts' ? T.bg : 'transparent',
                        color: activeTab === 'drafts' ? T.fg : T.muted,
                        boxShadow: activeTab === 'drafts' ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                        transition: 'all 0.15s ease',
                    }}
                >
                    Drafts ({draftOrders.length})
                </button>
                <button
                    onClick={() => setActiveTab('booked')}
                    style={{
                        border: 'none',
                        padding: '7px 20px',
                        borderRadius: '6px',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: activeTab === 'booked' ? T.bg : 'transparent',
                        color: activeTab === 'booked' ? T.fg : T.muted,
                        boxShadow: activeTab === 'booked' ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                        transition: 'all 0.15s ease',
                    }}
                >
                    Booked ({bookedOrders.length})
                </button>
            </div>

            {/* Render Drafts Tab */}
            {activeTab === 'drafts' && (
                <div>

                    {/* Draft section header with bulk actions */}
                    {draftOrders.length > 0 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 16,
                            background: T.card,
                            border: `1px solid ${T.border}`,
                            borderRadius: '8px',
                            padding: '10px 16px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <select
                                    onChange={(e) => handleBulkSelectDraft(e.target.value as any)}
                                    defaultValue=""
                                    style={{
                                        border: `1px solid ${T.border}`,
                                        borderRadius: '6px',
                                        padding: '5px 10px',
                                        fontSize: '0.8rem',
                                        background: T.bg,
                                        cursor: 'pointer',
                                        outline: 'none',
                                    }}
                                >
                                    <option value="" disabled>Select...</option>
                                    <option value="all">Select All</option>
                                    <option value="none">Select None</option>
                                    <option value="valid">Select Valid Only</option>
                                </select>

                                {selectedDrafts.size > 0 && (
                                    <button
                                        onClick={handleDeleteSelectedDrafts}
                                        disabled={deleting}
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: '#dc2626',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                        }}
                                    >
                                        <Trash2 size={13} /> Delete Selected ({selectedDrafts.size})
                                    </button>
                                )}
                            </div>

                            <motion.button
                                onClick={handleBookSelected}
                                disabled={selectedDrafts.size === 0 || booking}
                                whileHover={{ scale: selectedDrafts.size === 0 || booking ? 1 : 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    background: selectedDrafts.size === 0 || booking ? '#e5e5e5' : T.accent,
                                    color: selectedDrafts.size === 0 || booking ? T.muted : '#fff',
                                    border: 'none', borderRadius: 8, padding: '8px 18px',
                                    fontSize: '0.82rem', fontWeight: 600,
                                    cursor: selectedDrafts.size === 0 || booking ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {booking ? <Loader2 size={13} className="animate-spin" /> : <PackageCheck size={13} />}
                                Book Now ({selectedDrafts.size})
                            </motion.button>
                        </div>
                    )}

                    {/* Draft cards list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <AnimatePresence>
                            {draftOrders.map((order, i) => {
                                const isInvalidPhone = isPhoneInvalid(order.phoneNumber);
                                const isExpanded = expandedDrafts.has(order.id);
                                const validationError = validationErrors.has(order.id);

                                return (
                                    <motion.div
                                        key={order.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, height: 0, overflow: 'hidden', marginBottom: 0 }}
                                        transition={{ duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                                        style={{
                                            background: T.bg,
                                            border: `1px solid ${validationError ? '#dc2626' : selectedDrafts.has(order.id) ? T.accent : T.border}`,
                                            borderRadius: 12,
                                            padding: '16px 20px',
                                            boxShadow: '0 2px 12px rgba(0,0,0,0.01)',
                                        }}
                                    >
                                        {/* Collapsed view header */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, cursor: 'pointer' }} onClick={() => toggleExpand(order.id)}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleSelectDraft(order.id);
                                                    }}
                                                    style={{
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        padding: 0, display: 'flex',
                                                        color: selectedDrafts.has(order.id) ? T.accent : '#d4d4d4',
                                                    }}
                                                >
                                                    {selectedDrafts.has(order.id) ? <CheckSquare size={17} /> : <Square size={17} />}
                                                </button>

                                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: T.fg }}>
                                                    {order.customerName || 'No Name'}
                                                </span>

                                                <span style={{
                                                    fontSize: '0.82rem',
                                                    color: isInvalidPhone ? '#dc2626' : T.muted,
                                                    fontWeight: isInvalidPhone ? 600 : 400,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}>
                                                    {order.phoneNumber || 'No Number'}
                                                    {isInvalidPhone && (
                                                        <span style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>
                                                            Invalid Number
                                                        </span>
                                                    )}
                                                </span>

                                                <span style={{ fontSize: '0.82rem', color: T.muted }}>
                                                    {order.city || 'No City'}
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => toggleExpand(order.id)}
                                                style={{ border: 'none', background: 'none', color: T.muted, cursor: 'pointer' }}
                                            >
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>

                                        {/* Expanded form details */}
                                        {isExpanded && (
                                            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                                                {/* Text Inputs */}
                                                <div>
                                                    <span style={{ fontSize: '0.7rem', color: T.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>Customer Name</span>
                                                    <input
                                                        type="text"
                                                        value={order.customerName || ''}
                                                        onChange={(e) => editLocal(order.id, 'customerName', e.target.value)}
                                                        onBlur={(e) => saveField(order.id, 'customerName', e.target.value)}
                                                        style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem', color: T.fg, outline: 'none' }}
                                                    />
                                                </div>

                                                <div>
                                                    <span style={{ fontSize: '0.7rem', color: T.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>Phone Number</span>
                                                    <input
                                                        type="text"
                                                        value={order.phoneNumber || ''}
                                                        onChange={(e) => editLocal(order.id, 'phoneNumber', e.target.value)}
                                                        onBlur={(e) => saveField(order.id, 'phoneNumber', e.target.value)}
                                                        style={{ width: '100%', border: `1px solid ${isInvalidPhone ? '#dc2626' : T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem', color: isInvalidPhone ? '#dc2626' : T.fg, outline: 'none' }}
                                                    />
                                                </div>

                                                <div>
                                                    <span style={{ fontSize: '0.7rem', color: T.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>City</span>
                                                    <input
                                                        type="text"
                                                        value={order.city || ''}
                                                        onChange={(e) => editLocal(order.id, 'city', e.target.value)}
                                                        onBlur={(e) => saveField(order.id, 'city', e.target.value)}
                                                        style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem', color: T.fg, outline: 'none' }}
                                                    />
                                                </div>

                                                <div>
                                                    <span style={{ fontSize: '0.7rem', color: T.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>Quantity</span>
                                                    <input
                                                        type="number"
                                                        value={order.quantity || 1}
                                                        onChange={(e) => editLocal(order.id, 'quantity', e.target.value)}
                                                        onBlur={(e) => saveField(order.id, 'quantity', parseInt(e.target.value) || 1)}
                                                        style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem', color: T.fg, outline: 'none' }}
                                                    />
                                                </div>

                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <span style={{ fontSize: '0.7rem', color: T.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>Address</span>
                                                    <input
                                                        type="text"
                                                        value={order.address || ''}
                                                        onChange={(e) => editLocal(order.id, 'address', e.target.value)}
                                                        onBlur={(e) => saveField(order.id, 'address', e.target.value)}
                                                        style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem', color: T.fg, outline: 'none' }}
                                                    />
                                                </div>

                                                {/* Product Catalog select dropdown */}
                                                {products.length > 0 && (
                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                        <span style={{ fontSize: '0.7rem', color: T.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>Product (from inventory)</span>
                                                        <div style={{ position: 'relative' }}>
                                                            <select
                                                                value={order.productId || ''}
                                                                onChange={(e) => handleProductSelect(order.id, e.target.value)}
                                                                style={{
                                                                    width: '100%', appearance: 'none',
                                                                    border: `1px solid ${validationError && !order.productId ? '#dc2626' : T.border}`, borderRadius: 8,
                                                                    padding: '7px 32px 7px 10px',
                                                                    fontSize: '0.85rem', color: T.fg,
                                                                    background: T.bg, cursor: 'pointer', outline: 'none',
                                                                }}
                                                            >
                                                                <option value="">— Select product —</option>
                                                                {products.map((p) => (
                                                                    <option key={p.id} value={p.id}>
                                                                        {p.name} · stock: {p.stockQuantity} · weight: {p.weight} kg
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown
                                                                size={13}
                                                                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted, pointerEvents: 'none' }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Manual product info when catalog is optional */}
                                                {!order.productId && (
                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                        <span style={{ fontSize: '0.7rem', color: T.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>Product details manually</span>
                                                        <input
                                                            type="text"
                                                            value={order.productInfo || ''}
                                                            onChange={(e) => editLocal(order.id, 'productInfo', e.target.value)}
                                                            onBlur={(e) => saveField(order.id, 'productInfo', e.target.value)}
                                                            style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem', color: T.fg, outline: 'none' }}
                                                        />
                                                    </div>
                                                )}

                                                {/* Pricing */}
                                                <div>
                                                    <span style={{ fontSize: '0.7rem', color: T.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>Selling Price (Rs)</span>
                                                    <input
                                                        type="number"
                                                        value={order.sellingPrice || ''}
                                                        onChange={(e) => editLocal(order.id, 'sellingPrice', e.target.value)}
                                                        onBlur={(e) => saveField(order.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
                                                        style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem', color: T.fg, outline: 'none' }}
                                                    />
                                                </div>

                                                <div>
                                                    <span style={{ fontSize: '0.7rem', color: T.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>Cost Price (Rs)</span>
                                                    <input
                                                        type="number"
                                                        value={order.costPrice || ''}
                                                        readOnly={!!order.productId}
                                                        onChange={(e) => editLocal(order.id, 'costPrice', e.target.value)}
                                                        onBlur={(e) => saveField(order.id, 'costPrice', parseFloat(e.target.value) || 0)}
                                                        style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem', color: order.productId ? T.muted : T.fg, background: order.productId ? T.card : T.bg, outline: 'none' }}
                                                    />
                                                </div>

                                                {/* Weight & Shipping Type */}
                                                <div>
                                                    <span style={{ fontSize: '0.7rem', color: T.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>Weight (kg)</span>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={order.weight || ''}
                                                        readOnly={!!order.productId}
                                                        onChange={(e) => editLocal(order.id, 'weight', e.target.value)}
                                                        onBlur={(e) => handleWeightChange(order.id, e.target.value)}
                                                        style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem', color: order.productId ? T.muted : T.fg, background: order.productId ? T.card : T.bg, outline: 'none' }}
                                                    />
                                                </div>

                                                <div>
                                                    <span style={{ fontSize: '0.7rem', color: T.muted, fontWeight: 500, display: 'block', marginBottom: 4 }}>Shipping Type</span>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        {['Overnight', 'Detain', 'Overland'].map((type) => {
                                                            const active = order.shippingType === type;
                                                            return (
                                                                <button
                                                                    key={type}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        editLocal(order.id, 'shippingType', type);
                                                                        saveField(order.id, 'shippingType', type);
                                                                    }}
                                                                    style={{
                                                                        flex: 1,
                                                                        border: `1px solid ${active ? T.accent : T.border}`,
                                                                        background: active ? T.accentLight : T.bg,
                                                                        color: active ? T.accent : T.fg,
                                                                        padding: '6px 0',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer',
                                                                    }}
                                                                >
                                                                    {type}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {draftOrders.length === 0 && !extracting && (
                        <div style={{ textAlign: 'center', padding: '80px 0', color: T.muted, fontSize: '0.9rem' }}>
                            No drafts yet. Paste customer orders above to start booking.
                        </div>
                    )}
                </div>
            )}

            {/* Render Booked Tab */}
            {activeTab === 'booked' && (
                <div>
                    {/* Bulk actions booked toolbar */}
                    {bookedOrders.length > 0 && (
                        <div style={{
                            background: T.card,
                            border: `1px solid ${T.border}`,
                            borderRadius: '8px',
                            padding: '10px 16px',
                            marginBottom: 16,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <button
                                    onClick={() => {
                                        const allSel = bookedOrders.every((o) => selectedBooked.has(o.id));
                                        if (allSel) setSelectedBooked(new Set());
                                        else setSelectedBooked(new Set(bookedOrders.map((o) => o.id)));
                                    }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: bookedOrders.every((o) => selectedBooked.has(o.id)) ? T.accent : '#d4d4d4' }}
                                >
                                    {bookedOrders.length > 0 && bookedOrders.every((o) => selectedBooked.has(o.id)) ? <CheckSquare size={17} /> : <Square size={17} />}
                                </button>

                                 <span style={{ fontSize: '0.8rem', color: T.muted, fontWeight: 500 }}>
                                    {selectedBooked.size} Selected
                                </span>

                                {selectedBooked.size > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        {/* If editing this particular order, show Save / Cancel at the top */}
                                        {editingBookedId ? (
                                            <>
                                                <button
                                                    onClick={saveInlineEditBooked}
                                                    disabled={savingEdit}
                                                    style={{
                                                        background: '#16a34a',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '6px 14px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        cursor: savingEdit ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                    }}
                                                >
                                                    {savingEdit ? <Loader2 size={13} className="animate-spin" /> : <Check size={12} />}
                                                    {savingEdit ? 'Saving...' : 'Save Edit'}
                                                </button>
                                                <button
                                                    onClick={() => setEditingBookedId(null)}
                                                    disabled={savingEdit}
                                                    style={{
                                                        border: `1px solid ${T.border}`,
                                                        background: T.bg,
                                                        color: T.muted,
                                                        borderRadius: '6px',
                                                        padding: '6px 14px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        cursor: savingEdit ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                    }}
                                                >
                                                    <X size={12} /> Cancel Edit
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {/* If exactly one selected, show Edit option */}
                                                {selectedBooked.size === 1 && (
                                                    <button
                                                        onClick={() => {
                                                            const id = Array.from(selectedBooked)[0];
                                                            const ord = bookedOrders.find((o) => o.id === id);
                                                            if (ord) startEditBooked(ord);
                                                        }}
                                                        style={{
                                                            border: `1px solid ${T.accent}`,
                                                            background: T.bg,
                                                            color: T.accent,
                                                            borderRadius: '6px',
                                                            padding: '4px 10px',
                                                            fontSize: '0.8rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <Edit2 size={12} /> Edit Order
                                                    </button>
                                                )}

                                                <button
                                                    onClick={handleUnbookSelected}
                                                    disabled={unbooking}
                                                    style={{
                                                        border: `1px solid #fecaca`,
                                                        background: '#fef2f2',
                                                        color: '#dc2626',
                                                        borderRadius: '6px',
                                                        padding: '4px 10px',
                                                        fontSize: '0.8rem',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                    }}
                                                >
                                                    {unbooking ? <Loader2 size={12} className="animate-spin" /> : <Undo size={12} />} Unbook Selected
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Booked orders table */}
                    <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.card }}>
                                        <th style={{ padding: '10px 16px', width: '40px' }}></th>
                                        {['Customer', 'City', 'Product', 'Weight', 'Shipping', 'Tracking', 'Status', 'Price', 'Profit', 'Date+Time'].map((h) => (
                                            <th key={h} style={{
                                                padding: '10px 16px', textAlign: 'left',
                                                fontSize: '0.68rem', fontWeight: 600, color: T.muted,
                                                letterSpacing: '0.05em', textTransform: 'uppercase',
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookedOrders.map((o, i) => {
                                        const isEditing = editingBookedId === o.id;
                                        const productObj = products.find((p) => p.id === o.productId);
                                        const displayProduct = productObj?.name ?? o.productInfo ?? '—';

                                        return (
                                            <tr
                                                key={o.id}
                                                style={{ borderBottom: `1px solid #f0f0f0`, background: isEditing ? '#fffbf8' : 'transparent' }}
                                            >
                                                {/* Checkbox */}
                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                    <button onClick={() => toggleSelectBooked(o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: selectedBooked.has(o.id) ? T.accent : '#d4d4d4' }}>
                                                        {selectedBooked.has(o.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                                    </button>
                                                </td>

                                                {/* Customer */}
                                                <td style={{ padding: '8px 12px', fontSize: '0.82rem', color: T.fg, fontWeight: 500 }}>
                                                    {isEditing ? (
                                                        <input
                                                            value={editBookedForm.customerName || ''}
                                                            onChange={(e) => setEditBookedForm({ ...editBookedForm, customerName: e.target.value })}
                                                            style={{ border: `1px solid ${T.border}`, borderRadius: '4px', padding: '2px 4px', fontSize: '0.78rem', width: '90px' }}
                                                        />
                                                    ) : (
                                                        o.customerName || '—'
                                                    )}
                                                </td>

                                                {/* City */}
                                                <td style={{ padding: '8px 12px', fontSize: '0.82rem', color: T.muted }}>
                                                    {isEditing ? (
                                                        <input
                                                            value={editBookedForm.city || ''}
                                                            onChange={(e) => setEditBookedForm({ ...editBookedForm, city: e.target.value })}
                                                            style={{ border: `1px solid ${T.border}`, borderRadius: '4px', padding: '2px 4px', fontSize: '0.78rem', width: '70px' }}
                                                        />
                                                    ) : (
                                                        o.city || '—'
                                                    )}
                                                </td>

                                                {/* Product */}
                                                <td style={{ padding: '8px 12px', fontSize: '0.82rem', color: T.muted }}>{displayProduct}</td>

                                                {/* Weight */}
                                                <td style={{ padding: '8px 12px', fontSize: '0.82rem', color: T.muted }}>
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={editBookedForm.weight || ''}
                                                            onChange={(e) => setEditBookedForm({ ...editBookedForm, weight: e.target.value })}
                                                            style={{ border: `1px solid ${T.border}`, borderRadius: '4px', padding: '2px 4px', fontSize: '0.78rem', width: '45px' }}
                                                        />
                                                    ) : (
                                                        o.weight ? `${o.weight} kg` : '—'
                                                    )}
                                                </td>

                                                {/* Shipping Type */}
                                                <td style={{ padding: '8px 12px', fontSize: '0.82rem', color: T.muted }}>
                                                    {isEditing ? (
                                                        <select
                                                            value={editBookedForm.shippingType || ''}
                                                            onChange={(e) => setEditBookedForm({ ...editBookedForm, shippingType: e.target.value })}
                                                            style={{ border: `1px solid ${T.border}`, borderRadius: '4px', padding: '2px 4px', fontSize: '0.78rem' }}
                                                        >
                                                            <option value="Overnight">Overnight</option>
                                                            <option value="Detain">Detain</option>
                                                            <option value="Overland">Overland</option>
                                                        </select>
                                                    ) : (
                                                        o.shippingType || '—'
                                                    )}
                                                </td>

                                                {/* Tracking */}
                                                <td style={{ padding: '8px 12px', fontSize: '0.74rem', color: T.muted, fontFamily: 'var(--font-geist-mono)' }}>{o.trackingNumber || '—'}</td>
                                                <td style={{ padding: '8px 12px' }}>
                                                    <span style={{ background: T.accent, color: '#fff', fontSize: '0.65rem', fontWeight: 600, padding: '1px 8px', borderRadius: 20 }}>Booked</span>
                                                </td>

                                                {/* Sell Price */}
                                                <td style={{ padding: '8px 12px', fontSize: '0.82rem', color: T.fg }}>
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            value={editBookedForm.sellingPrice || ''}
                                                            onChange={(e) => setEditBookedForm({ ...editBookedForm, sellingPrice: e.target.value })}
                                                            style={{ border: `1px solid ${T.border}`, borderRadius: '4px', padding: '2px 4px', fontSize: '0.78rem', width: '70px' }}
                                                        />
                                                    ) : (
                                                        o.sellingPrice ? `Rs ${Number(o.sellingPrice).toLocaleString('en-PK')}` : '—'
                                                    )}
                                                </td>

                                                {/* Profit */}
                                                <td style={{ padding: '8px 12px', fontSize: '0.82rem', fontWeight: 600, color: Number(o.profit ?? 0) > 0 ? '#16a34a' : '#0a0a0a' }}>
                                                    {o.profit ? `Rs ${Number(o.profit).toLocaleString('en-PK')}` : '—'}
                                                </td>
                                                <td style={{ padding: '8px 12px', fontSize: '0.78rem', color: T.muted }}>{new Date(o.createdAt).toLocaleDateString('en-PK')}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {bookedOrders.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '80px 0', color: T.muted, fontSize: '0.9rem' }}>
                            No booked shipments yet. Book drafts to see them here.
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}