'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, KeyRound, CheckCircle, HelpCircle } from 'lucide-react';

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

export default function ConnectCourierPage() {
    const [apiKey, setApiKey] = useState('');
    const [connected, setConnected] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        async function checkAuthAndStatus() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setAuthLoading(false);

            try {
                const res = await fetch('/api/account/connect-flaship');
                if (res.ok) {
                    const data = await res.json();
                    setConnected(data.connected);
                } else {
                    setConnected(false);
                }
            } catch (err) {
                setConnected(false);
            }
        }
        checkAuthAndStatus();
    }, [router, supabase.auth]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!apiKey.trim()) return;

        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/account/connect-flaship', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: apiKey }),
            });

            if (!res.ok) {
                const body = await res.json();
                throw new Error(body.error || 'Failed to connect account');
            }

            const data = await res.json();
            if (data.connected) {
                setConnected(true);
                setApiKey('');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (authLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: T.bg,
                color: T.muted,
                fontFamily: 'var(--font-geist-sans), sans-serif',
            }}>
                Loading settings...
            </div>
        );
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
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
            }}
        >
            {/* Header */}
            <div style={{ marginBottom: 36 }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: T.fg, margin: 0 }}>Courier Settings</h1>
                <p style={{ color: T.muted, fontSize: '0.875rem', margin: '4px 0 0' }}>
                    Connect and configure your shipping providers to automate booking.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: '600px' }}>
                {/* Connection Status Card */}
                <div style={{
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    borderRadius: '12px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: T.fg, margin: 0 }}>Flaship integration</h2>
                            <p style={{ fontSize: '0.8rem', color: T.muted, margin: '4px 0 0' }}>
                                Automatic shipping and tracking label generation
                            </p>
                        </div>
                        <AnimatePresence mode="wait">
                            {connected === null ? (
                                <motion.span
                                    key="checking"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ fontSize: '0.8rem', color: T.muted }}
                                >
                                    Checking...
                                </motion.span>
                            ) : connected ? (
                                <motion.span
                                    key="connected"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    style={{
                                        background: '#d1fae5',
                                        color: '#065f46',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        border: '1px solid #a7f3d0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                    }}
                                >
                                    <CheckCircle size={12} /> Connected
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="not-connected"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    style={{
                                        background: T.card,
                                        color: T.muted,
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        border: `1px solid ${T.border}`,
                                    }}
                                >
                                    Not Connected
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Form Card */}
                <div style={{
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: '12px',
                    padding: '28px 24px 24px',
                }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: T.fg, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <KeyRound size={14} color={T.accent} /> Flaship API Key
                            </label>
                            <input
                                type="text"
                                placeholder="Enter your api key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                required
                                style={{
                                    border: `1px solid ${T.border}`,
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    fontSize: '0.875rem',
                                    color: T.fg,
                                    background: T.bg,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.15s',
                                }}
                                onFocus={(e) => e.target.style.borderColor = T.accent}
                                onBlur={(e) => e.target.style.borderColor = T.border}
                            />
                        </div>

                        {error && (
                            <p style={{ fontSize: '0.8rem', color: '#dc2626', margin: 0 }}>
                                {error}
                            </p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '70%' }}>
                                <ShieldCheck size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
                                <p style={{ fontSize: '0.72rem', color: T.muted, margin: 0, lineHeight: 1.4 }}>
                                    Your API key is encrypted with AES-256-GCM and never exposed.
                                </p>
                            </div>

                            <motion.button
                                type="submit"
                                disabled={loading || !apiKey.trim()}
                                whileHover={{ scale: loading || !apiKey.trim() ? 1 : 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    background: loading || !apiKey.trim() ? '#e5e5e5' : T.accent,
                                    color: loading || !apiKey.trim() ? T.muted : '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 24px',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    cursor: loading || !apiKey.trim() ? 'not-allowed' : 'pointer',
                                    transition: 'background 0.15s, color 0.15s',
                                }}
                            >
                                {loading ? 'Saving...' : 'Save API Key'}
                            </motion.button>
                        </div>
                    </form>
                </div>
            </div>
        </motion.div>
    );
}