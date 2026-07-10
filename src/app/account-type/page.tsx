'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Boxes, ShoppingBag, Check } from 'lucide-react';

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

const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            staggerChildren: 0.06,
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1] as const,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function AccountTypePage() {
    const [selectedType, setSelectedType] = useState<'inventory_holder' | 'reseller' | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    async function choose(type: 'inventory_holder' | 'reseller') {
        setSelectedType(type);
        setSaving(true);
        setError('');

        try {
            const res = await fetch('/api/account/account-type', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_type: type }),
            });

            if (!res.ok) {
                const body = await res.json();
                throw new Error(body.error || 'Something went wrong');
            }

            localStorage.removeItem('bns_account_type');
            router.push('/connect-courier');
        } catch (err: any) {
            setError(err.message);
            setSaving(false);
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: T.bg,
            color: T.fg,
            fontFamily: 'var(--font-geist-sans), sans-serif',
            padding: '40px 24px',
            boxSizing: 'border-box',
        }}>
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                style={{
                    maxWidth: '850px',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                {/* Header */}
                <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: 40 }}>
                    <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: T.fg, margin: '0 0 8px' }}>
                        Choose your business model
                    </h1>
                    <p style={{ color: T.muted, fontSize: '0.925rem', margin: 0, maxWidth: '480px' }}>
                        This customizes your order workflows and inventory settings. You can update this later.
                    </p>
                </motion.div>

                {/* Cards Container */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                    gap: 24,
                    width: '100%',
                    marginBottom: 24,
                }}>
                    {/* Card 1: Inventory Holder */}
                    <motion.div
                        variants={itemVariants}
                        onClick={() => setSelectedType('inventory_holder')}
                        whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.06)' }}
                        style={{
                            background: selectedType === 'inventory_holder' ? T.accentLight : T.bg,
                            border: `1px solid ${selectedType === 'inventory_holder' ? T.accent : T.border}`,
                            borderRadius: '12px',
                            padding: '32px 28px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'background 0.25s, border-color 0.25s',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                        }}
                    >
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '10px',
                            background: selectedType === 'inventory_holder' ? T.accent : '#f4ede9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 20,
                            color: selectedType === 'inventory_holder' ? '#ffffff' : T.accent,
                        }}>
                            <Boxes size={22} />
                        </div>

                        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 4px', color: T.fg }}>
                            Inventory Holder
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: T.muted, margin: '0 0 24px', fontWeight: 500 }}>
                            I own and manage stock
                        </p>

                        {/* Features */}
                        <ul style={{
                            listStyle: 'none',
                            padding: 0,
                            margin: '0 0 32px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            flex: 1,
                        }}>
                            {[
                                'Track stock levels per product',
                                'Auto-deduct inventory on booking',
                                'Cost price from product catalog',
                                'Profit calculated automatically',
                                'Low stock & out of stock alerts'
                            ].map((feat, idx) => (
                                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.85rem', color: '#404040' }}>
                                    <Check size={14} color={T.accent} style={{ flexShrink: 0, marginTop: 3 }} />
                                    <span>{feat}</span>
                                </li>
                            ))}
                        </ul>

                        <motion.button
                            disabled={saving}
                            onClick={(e) => {
                                e.stopPropagation();
                                choose('inventory_holder');
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                width: '100%',
                                background: T.accent,
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '12px 18px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.accentHover}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = T.accent}
                        >
                            {saving && selectedType === 'inventory_holder' ? 'Starting...' : 'Start as Inventory Holder'}
                        </motion.button>
                    </motion.div>

                    {/* Card 2: Reseller */}
                    <motion.div
                        variants={itemVariants}
                        onClick={() => setSelectedType('reseller')}
                        whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.06)' }}
                        style={{
                            background: selectedType === 'reseller' ? T.accentLight : T.bg,
                            border: `1px solid ${selectedType === 'reseller' ? T.accent : T.border}`,
                            borderRadius: '12px',
                            padding: '32px 28px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'background 0.25s, border-color 0.25s',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                        }}
                    >
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '10px',
                            background: selectedType === 'reseller' ? T.accent : '#f4ede9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 20,
                            color: selectedType === 'reseller' ? '#ffffff' : T.accent,
                        }}>
                            <ShoppingBag size={22} />
                        </div>

                        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 4px', color: T.fg }}>
                            Reseller
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: T.muted, margin: '0 0 24px', fontWeight: 500 }}>
                            I source and resell products
                        </p>

                        {/* Features */}
                        <ul style={{
                            listStyle: 'none',
                            padding: 0,
                            margin: '0 0 32px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            flex: 1,
                        }}>
                            {[
                                'No inventory management needed',
                                'Enter cost + sell price per order',
                                'Optional: link to product catalog',
                                'Profit tracked per order',
                                'Full ledger and reports'
                            ].map((feat, idx) => (
                                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.85rem', color: '#404040' }}>
                                    <Check size={14} color={T.accent} style={{ flexShrink: 0, marginTop: 3 }} />
                                    <span>{feat}</span>
                                </li>
                            ))}
                        </ul>

                        <motion.button
                            disabled={saving}
                            onClick={(e) => {
                                e.stopPropagation();
                                choose('reseller');
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                width: '100%',
                                background: T.accent,
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '12px 18px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.accentHover}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = T.accent}
                        >
                            {saving && selectedType === 'reseller' ? 'Starting...' : 'Start as Reseller'}
                        </motion.button>
                    </motion.div>
                </div>

                {error && (
                    <motion.p
                        variants={itemVariants}
                        style={{
                            fontSize: '0.85rem',
                            color: '#dc2626',
                            textAlign: 'center',
                            marginTop: 12,
                            fontWeight: 500,
                        }}
                    >
                        {error}
                    </motion.p>
                )}
            </motion.div>
        </div>
    );
}