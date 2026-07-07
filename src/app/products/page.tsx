'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { uploadProductImage } from '@/lib/uploadProductImage';
import {
    Plus,
    X,
    Search,
    Trash2,
    Edit2,
    Calendar,
    Image as ImageIcon,
    UploadCloud,
    Loader2,
    Tag,
    CheckSquare,
    Square,
    AlertTriangle,
} from 'lucide-react';

type Product = {
    id: string;
    name: string;
    sku: string | null;
    imageUrl: string | null;
    costPrice: string;
    stockQuantity: number;
    weight: string;
    createdAt: string;
};

type Profile = {
    id: string;
    accountType: 'inventory_holder' | 'reseller';
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

// Title Case helper
const titleCase = (str: string) => {
    return str
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    
    // Separate Search Queries
    const [searchQuery, setSearchQuery] = useState('');
    const [dateQuery, setDateQuery] = useState('');

    // Panel controls
    const [showPanel, setShowPanel] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form inputs
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [stockQuantity, setStockQuantity] = useState('');
    const [weight, setWeight] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);

    // Drag-and-drop state
    const [dragOver, setDragOver] = useState(false);



    // Upload progress
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Custom deleting progress modal state
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteProgress, setDeleteProgress] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        refresh();
        loadProfile();
    }, []);

    async function refresh() {
        const res = await fetch('/api/products');
        const body = await res.json();
        setProducts(body.products || []);
    }

    async function loadProfile() {
        const res = await fetch('/api/orders');
        const body = await res.json();
        if (body.profile) setProfile(body.profile);
    }

    // Custom XMLHttpRequest upload to show real progress (steps 1 to 10)
    const uploadWithProgress = async (file: File, userId: string): Promise<string> => {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        return new Promise((resolve, reject) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}/${Date.now()}.${fileExt}`;
            const uploadUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/product-images/${fileName}`;

            const xhr = new XMLHttpRequest();
            xhr.open('POST', uploadUrl, true);

            xhr.setRequestHeader('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    setUploadProgress(percent);
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 201) {
                    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${fileName}`;
                    resolve(publicUrl);
                } else {
                    reject(new Error('Upload failed'));
                }
            };

            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(file);
        });
    };

    async function handleSaveProduct(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSaving(true);
        setUploadProgress(null);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            let imageUrl = editingProduct?.imageUrl || null;

            if (imageFile) {
                try {
                    imageUrl = await uploadWithProgress(imageFile, user.id);
                } catch (uploadErr) {
                    try {
                        imageUrl = await uploadProductImage(imageFile, user.id);
                    } catch (fallbackErr) {
                        console.warn('Image upload failed, continuing without image:', fallbackErr);
                    }
                }
            }

            // Capitalize first letter of each word in the product name
            const capitalizedName = titleCase(name);

            if (editingProduct) {
                const res = await fetch(`/api/products/${editingProduct.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: capitalizedName,
                        sku: sku || null,
                        costPrice: parseFloat(costPrice) || 0,
                        stockQuantity: parseInt(stockQuantity) || 0,
                        weight: parseFloat(weight) || 0,
                        imageUrl,
                    }),
                });

                if (!res.ok) {
                    const errBody = await res.json().catch(() => ({}));
                    throw new Error(errBody.error || `Server error ${res.status}`);
                }
            } else {
                const createRes = await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: capitalizedName,
                        sku: sku || null,
                        cost_price: parseFloat(costPrice) || 0,
                        stock_quantity: parseInt(stockQuantity) || 0,
                        weight: parseFloat(weight) || 0,
                    }),
                });

                if (!createRes.ok) {
                    const errBody = await createRes.json().catch(() => ({}));
                    throw new Error(errBody.error || `Server error ${createRes.status}`);
                }

                if (imageUrl) {
                    const newProd = await createRes.json();
                    await fetch(`/api/products/${newProd.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageUrl }),
                    });
                }
            }

            resetForm();
            await refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
            setUploadProgress(null);
        }
    }

    function resetForm() {
        setName('');
        setSku('');
        setCostPrice('');
        setStockQuantity('');
        setWeight('');
        setImageFile(null);
        setEditingProduct(null);
        setShowPanel(false);
        setUploadProgress(null);
    }

    function startEdit(product: Product) {
        setEditingProduct(product);
        setName(product.name);
        setSku(product.sku || '');
        setCostPrice(product.costPrice);
        setStockQuantity(String(product.stockQuantity));
        setWeight(product.weight || '0');
        setShowPanel(true);
    }

    // Custom animated deletion sequence (1 to 100)
    function startDeleteSequence(id: string) {
        setDeletingId(id);
        setDeleteProgress(null);
    }

    async function executeDelete() {
        if (!deletingId) return;
        
        let current = 0;
        const interval = setInterval(() => {
            current += 4;
            setDeleteProgress(current);
            if (current >= 100) {
                clearInterval(interval);
                performDeleteCall();
            }
        }, 25);
    }

    async function performDeleteCall() {
        if (!deletingId) return;
        const targetId = deletingId;
        try {
            if (targetId === 'bulk') {
                for (const id of selectedProducts) {
                    await fetch(`/api/products/${id}`, { method: 'DELETE' });
                }
                setSelectedProducts(new Set());
            } else {
                await fetch(`/api/products/${targetId}`, { method: 'DELETE' });
                setSelectedProducts((prev) => {
                    const next = new Set(prev);
                    next.delete(targetId);
                    return next;
                });
            }
            await refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setDeletingId(null);
            setDeleteProgress(null);
        }
    }

    // Direct Image upload from card click
    async function handleDirectImageUpload(product: Product, file: File) {
        setError('');
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const imageUrl = await uploadProductImage(file, user.id);
            await fetch(`/api/products/${product.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl }),
            });
            await refresh();
        } catch (err: any) {
            setError(err.message);
        }
    }

    // Toggling Select/Unselect controls
    function toggleSelectProduct(id: string) {
        setSelectedProducts((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    // Toggle Bulk select all / clear all
    function handleSelectAllToggle() {
        const allSelected = products.length > 0 && products.every((p) => selectedProducts.has(p.id));
        if (allSelected) {
            setSelectedProducts(new Set());
        } else {
            const allIds = products.map((p) => p.id);
            setSelectedProducts(new Set(allIds));
        }
    }

    // Bulk edit product details handler


    const formatProductDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    // Advanced search logic
    const filteredProducts = products.filter((p) => {
        // Text/details search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesText = p.name.toLowerCase().includes(q) || (p.sku?.toLowerCase().includes(q) ?? false);
            if (!matchesText) return false;
        }
        // Date picker search
        if (dateQuery) {
            const selectD = new Date(dateQuery).toDateString();
            const prodD = new Date(p.createdAt).toDateString();
            if (selectD !== prodD) return false;
        }
        return true;
    });

    return (
        <>
        {/* Custom confirmation top-modal for deletes */}
        <AnimatePresence>
            {deletingId && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 20, pointerEvents: 'none' }}>
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        style={{
                            background: '#ffffff',
                            border: '1px solid #fecaca',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                            padding: '20px 24px',
                            width: '90%',
                            maxWidth: '440px',
                            boxSizing: 'border-box',
                            pointerEvents: 'auto',
                        }}
                    >
                        {deleteProgress === null ? (
                            <div>
                                <h3 style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertTriangle size={16} /> Confirm Deletion
                                </h3>
                                <p style={{ fontSize: '0.8rem', color: T.muted, margin: '0 0 16px', lineHeight: 1.4 }}>
                                    Are you sure you want to delete {deletingId === 'bulk' ? `selected products (${selectedProducts.size})` : 'this product'}?
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                    <button
                                        onClick={() => { setDeletingId(null); setDeleteProgress(null); }}
                                        style={{ border: `1px solid ${T.border}`, background: 'transparent', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: T.muted }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={executeDelete}
                                        style={{ border: 'none', background: '#dc2626', color: '#fff', padding: '6px 16px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: T.fg, margin: '0 0 10px' }}>
                                    Deleting Product... {deleteProgress}%
                                </p>
                                <div style={{ width: '100%', height: '8px', background: T.border, borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${deleteProgress}%`, height: '100%', background: '#dc2626', transition: 'width 0.05s linear' }} />
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

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
                position: 'relative',
            }}
            className="bns-page"
        >

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: T.fg, margin: 0 }}>Inventory Catalog</h1>
                    <p style={{ color: T.muted, fontSize: '0.875rem', margin: '4px 0 0' }}>
                        {profile?.accountType === 'inventory_holder' ? 'Inventory Holder' : 'Reseller'} Catalog · {products.length} product(s)
                    </p>
                </div>
                <motion.button
                    onClick={() => { if (showPanel) resetForm(); else setShowPanel(true); }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: T.accent, color: '#fff', border: 'none',
                        borderRadius: 8, padding: '9px 18px', fontSize: '0.875rem',
                        fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    {showPanel ? <X size={14} /> : <Plus size={14} />}
                    {showPanel ? 'Cancel' : 'Add Product'}
                </motion.button>
            </div>

            {/* Error Message banner */}
            {error && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.8rem', borderRadius: 8, marginBottom: 20 }}>
                    {error}
                </div>
            )}

            {/* Filter controls + Bulk actions toolbar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
                marginBottom: 24,
                flexWrap: 'wrap',
            }}>
                {/* Search Fields Area */}
                <div style={{ display: 'flex', gap: 12, flex: 1, maxWidth: '620px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                        <input
                            type="text"
                            placeholder="Search by details (Name, SKU)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                border: `1px solid ${T.border}`,
                                borderRadius: '8px',
                                padding: '8px 12px 8px 34px',
                                fontSize: '0.85rem',
                                outline: 'none',
                                background: T.card,
                                boxSizing: 'border-box',
                            }}
                        />
                        <Search size={14} color={T.muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    </div>

                    <div style={{ position: 'relative', width: '180px' }}>
                        <input
                            type="date"
                            value={dateQuery}
                            onChange={(e) => setDateQuery(e.target.value)}
                            style={{
                                width: '100%',
                                border: `1px solid ${T.border}`,
                                borderRadius: '8px',
                                padding: '8px 12px 8px 34px',
                                fontSize: '0.85rem',
                                outline: 'none',
                                background: T.card,
                                boxSizing: 'border-box',
                                color: T.fg,
                            }}
                        />
                        <Calendar size={14} color={T.muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        {dateQuery && (
                            <button onClick={() => setDateQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: T.muted }}>
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={handleSelectAllToggle}
                        style={{
                            border: `1px solid ${products.length > 0 && products.every((p) => selectedProducts.has(p.id)) ? T.accent : T.border}`,
                            background: products.length > 0 && products.every((p) => selectedProducts.has(p.id)) ? T.accentLight : T.bg,
                            color: products.length > 0 && products.every((p) => selectedProducts.has(p.id)) ? T.accent : T.fg,
                            padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500,
                        }}
                    >
                        {products.length > 0 && products.every((p) => selectedProducts.has(p.id)) ? 'Clear Selection' : 'Select All'}
                    </button>
                    
                    {selectedProducts.size > 0 && (
                        <>
                            <button
                                onClick={() => startDeleteSequence('bulk')}
                                style={{ border: 'none', background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Delete Selected ({selectedProducts.size})
                            </button>
                        </>
                    )}
                </div>
            </div>


            {/* Form Slide Panel */}
            <AnimatePresence>
                {showPanel && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden', marginBottom: 28 }}
                    >
                        <form onSubmit={handleSaveProduct} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24 }}>
                            <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: T.fg, margin: '0 0 16px' }}>
                                {editingProduct ? 'Edit Product' : 'Add Product'}
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                                <label style={{ display: 'block' }}>
                                    <span style={{ fontSize: '0.72rem', color: T.muted, display: 'block', marginBottom: 4 }}>Name *</span>
                                    <input required value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem' }} />
                                </label>

                                <label style={{ display: 'block' }}>
                                    <span style={{ fontSize: '0.72rem', color: T.muted, display: 'block', marginBottom: 4 }}>SKU</span>
                                    <input value={sku} onChange={(e) => setSku(e.target.value)} style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem' }} />
                                </label>

                                <label style={{ display: 'block' }}>
                                    <span style={{ fontSize: '0.72rem', color: T.muted, display: 'block', marginBottom: 4 }}>Cost Price (Rs) *</span>
                                    <input required type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem' }} />
                                </label>

                                {profile?.accountType === 'inventory_holder' && (
                                    <label style={{ display: 'block' }}>
                                        <span style={{ fontSize: '0.72rem', color: T.muted, display: 'block', marginBottom: 4 }}>Stock Quantity</span>
                                        <input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem' }} />
                                    </label>
                                )}

                                <label style={{ display: 'block' }}>
                                    <span style={{ fontSize: '0.72rem', color: T.muted, display: 'block', marginBottom: 4 }}>Weight (kg)</span>
                                    <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 10px', fontSize: '0.85rem' }} />
                                </label>

                                {/* Drag-and-drop Image Upload Zone */}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <span style={{ fontSize: '0.72rem', color: T.muted, display: 'block', marginBottom: 6 }}>Product Image</span>
                                    
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                        onDragLeave={() => setDragOver(false)}
                                        onDrop={async (e) => {
                                            e.preventDefault();
                                            setDragOver(false);
                                            const file = e.dataTransfer.files?.[0];
                                            if (file) setImageFile(file);
                                        }}
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            border: `2px dashed ${dragOver ? T.accent : T.border}`,
                                            background: dragOver ? T.accentLight : T.bg,
                                            borderRadius: 12,
                                            padding: '28px 20px',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        {imageFile ? (
                                            <>
                                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                                                    <span style={{ fontSize: '1.2rem' }}>✓</span>
                                                </div>
                                                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16a34a', margin: '0 0 2px' }}>
                                                    Image Ready
                                                </p>
                                                <p style={{ fontSize: '0.72rem', color: T.muted, margin: 0 }}>
                                                    Click to change image
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <UploadCloud size={28} color={T.accent} style={{ margin: '0 auto 8px' }} />
                                                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: T.fg, margin: '0 0 4px' }}>
                                                    Drop image here, or click to select
                                                </p>
                                                <p style={{ fontSize: '0.72rem', color: T.muted, margin: 0 }}>
                                                    Supports JPG, PNG, WEBP · Max 5MB
                                                </p>
                                            </>
                                        )}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                            style={{ display: 'none' }}
                                        />
                                    </div>

                                    {uploadProgress !== null && (
                                        <div style={{ marginTop: 12 }}>
                                            <p style={{ fontSize: '0.78rem', color: T.accent, fontWeight: 600, margin: 0 }}>
                                                Uploading image: Step {Math.ceil(uploadProgress / 10)} of 10 ({uploadProgress}%)
                                            </p>
                                            <div style={{ width: '100%', height: '6px', background: T.border, borderRadius: '3px', marginTop: 6, overflow: 'hidden' }}>
                                                <div style={{ width: `${uploadProgress}%`, height: '100%', background: T.accent, transition: 'width 0.1s ease' }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                                <motion.button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        border: 'none', background: T.accent, color: '#fff',
                                        borderRadius: 8, padding: '9px 20px', fontSize: '0.85rem',
                                        fontWeight: 600, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                    }}
                                >
                                    {saving ? <Loader2 size={14} /> : <UploadCloud size={14} />}
                                    {saving ? 'Saving...' : 'Save Product'}
                                </motion.button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    style={{
                                        border: `1px solid ${T.border}`, background: T.bg,
                                        borderRadius: 8, padding: '9px 20px', fontSize: '0.85rem',
                                        fontWeight: 600, cursor: 'pointer', color: T.muted,
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Products grid */}
            {filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
                    No products matching search criteria.
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: 20,
                }}>
                    <AnimatePresence>
                        {filteredProducts.map((p, idx) => {
                            const isSelected = selectedProducts.has(p.id);
                            const outOfStock = profile?.accountType === 'inventory_holder' && p.stockQuantity === 0;
                            const lowStock = profile?.accountType === 'inventory_holder' && p.stockQuantity > 0 && p.stockQuantity < 5;

                            return (
                                <motion.div
                                    key={p.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: outOfStock ? 0.6 : 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                                    style={{
                                        background: T.bg,
                                        border: `1px solid ${isSelected ? T.accent : T.border}`,
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.01)',
                                    }}
                                >
                                    <div style={{ padding: '14px', display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
                                        {/* Image Label trigger for direct file upload (no ref collisions) */}
                                        <label style={{
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: '8px',
                                            background: T.card,
                                            border: `1px solid ${T.border}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                            position: 'relative',
                                        }}>
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleDirectImageUpload(p, file);
                                                }}
                                                style={{ display: 'none' }}
                                            />
                                            {p.imageUrl ? (
                                                <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '0.62rem', color: T.muted, textAlign: 'center', fontWeight: 600, padding: 2 }}>Add Image</span>
                                            )}
                                        </label>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <button
                                                    onClick={() => toggleSelectProduct(p.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: isSelected ? T.accent : '#d4d4d4' }}
                                                >
                                                    {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                                </button>
                                                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: T.fg, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {p.name}
                                                </p>
                                            </div>
                                            <p style={{ fontSize: '0.72rem', color: T.muted, margin: '2px 0 0', fontFamily: 'var(--font-geist-mono)' }}>
                                                {p.sku || 'No SKU'}
                                            </p>

                                            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: T.fg, margin: '6px 0 0' }}>
                                                Rs {Number(p.costPrice).toLocaleString('en-PK')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Footer details */}
                                    <div style={{ padding: '8px 14px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.62rem', background: T.card, border: `1px solid ${T.border}`, borderRadius: '4px', padding: '1px 5px', color: T.muted }}>
                                                {p.weight || '0'} kg
                                            </span>
                                            
                                            {profile?.accountType === 'inventory_holder' && (
                                                <span style={{ fontSize: '0.62rem', background: outOfStock ? '#fef2f2' : lowStock ? '#fff7ed' : '#f0fdf4', border: `1px solid ${outOfStock ? '#fecaca' : lowStock ? '#fed7aa' : '#bbf7d0'}`, borderRadius: '4px', padding: '1px 5px', color: outOfStock ? '#dc2626' : lowStock ? '#c2410c' : '#15803d', fontWeight: 600 }}>
                                                    {outOfStock ? 'Out of stock' : lowStock ? 'Low stock' : `${p.stockQuantity} stock`}
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => startEdit(p)} style={{ border: 'none', background: 'none', color: T.accent, cursor: 'pointer', padding: 0 }}><Edit2 size={13} /></button>
                                            <button onClick={() => startDeleteSequence(p.id)} style={{ border: 'none', background: 'none', color: T.muted, cursor: 'pointer', padding: 0 }}><Trash2 size={13} /></button>
                                        </div>
                                    </div>

                                    <div style={{ padding: '4px 14px 10px', fontSize: '0.65rem', color: T.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Calendar size={10} />
                                        <span>{formatProductDate(p.createdAt)}</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
        </>
    );
}