'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, ShieldCheck, RefreshCw, AlertCircle, ArrowRight, CheckCircle2, Info, ExternalLink } from 'lucide-react';
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

export default function ConnectCourier() {
    const { toast } = useToast();
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Input key + confirmation, 2: Syncing, 3: Success (permanent)
    const [error, setError] = useState<string | null>(null);
    const [accountInfo, setAccountInfo] = useState<any>(null);

    const [progressPercent, setProgressPercent] = useState(0);
    const [currentProgressText, setCurrentProgressText] = useState('Securing API credentials connection...');
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Fetch existing connection on mount
    useEffect(() => {
        setCheckingAuth(true);
        fetch('/api/courier/account')
            .then(r => r.json())
            .then(data => {
                if (data.account && data.meta) {
                    setAccountInfo(data.meta);
                    setStep(3);
                }
            })
            .catch(() => toast('error', 'Failed to load data'))
            .finally(() => {
                setCheckingAuth(false);
            });
    }, []);

    async function handleConnect(e: React.FormEvent) {
        e.preventDefault();
        if (!apiKey.trim()) return;

        setLoading(true);
        setError(null);
        setStep(2);
        setProgressPercent(0);
        setCurrentProgressText('Securing API credentials connection...');

        const startTime = Date.now();
        const duration = 4000;
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const percentage = Math.min(Math.floor((elapsed / duration) * 95), 95);
            setProgressPercent(percentage);

            if (percentage < 25) {
                setCurrentProgressText('Securing API credentials connection...');
            } else if (percentage < 50) {
                setCurrentProgressText('Syncing courier carriers & pickup locations...');
            } else if (percentage < 75) {
                setCurrentProgressText('Caching operational cities database...');
            } else {
                setCurrentProgressText('Saving service rate cards...');
            }
        }, 100);

        try {
            const res = await fetch('/api/courier/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Connection failed');

            clearInterval(interval);
            setProgressPercent(100);
            setCurrentProgressText('Done! Synchronized successfully.');

            setTimeout(() => {
                setAccountInfo(data.account);
                setStep(3);
            }, 500);
        } catch (err: any) {
            clearInterval(interval);
            setError(err.message);
            setStep(1);
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
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Courier API Integration</h1>
                <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">Secure connection credential configuration page.</p>
            </div>

            <div style={{ maxWidth: '600px' }}>
                {checkingAuth ? (
                    <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '32px', background: T.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                        <RefreshCw size={24} className="animate-spin" color={T.accent} style={{ marginBottom: '12px' }} />
                        <span style={{ fontSize: '0.82rem', color: T.muted }}>Checking active connection...</span>
                    </div>
                ) : (
                    <>
                {step === 1 && (
                    <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '32px', background: T.card }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ background: T.accentLight, padding: '10px', borderRadius: '8px', color: T.accent }}>
                                <Key size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Flaship Integration Wizard</h3>
                                <p style={{ fontSize: '0.8rem', color: T.muted }}>Provide API connection parameters below.</p>
                            </div>
                        </div>

                        {error && (
                            <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', color: '#ef4444', fontSize: '0.8rem', marginBottom: '20px' }}>
                                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Permanent Binding Warning */}
                        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px', fontSize: '0.8rem', color: '#9a3412', lineHeight: 1.6 }}>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                                <Info size={18} style={{ flexShrink: 0, marginTop: 1, color: '#ea580c' }} />
                                <div>
                                    <strong style={{ fontSize: '0.82rem' }}>This connection is permanent.</strong>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>
                                        Once connected, this Flaship account will be permanently bound to your Blink N Ship account.
                                        You will not be able to disconnect, replace, or switch to another Flaship account later.
                                        This can only be changed through official support by permanently deleting your Blink N Ship account.
                                    </p>
                                </div>
                            </div>
                            
                        </div>

                        <form onSubmit={handleConnect}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>API Token Key</label>
                                <input
                                    type="text"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter your API token key"
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: `1px solid ${T.border}`, fontSize: '0.875rem', fontFamily: 'monospace', outline: 'none' }}
                                    disabled={loading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !apiKey.trim()}
                                style={{ width: '100%', padding: '12px', background: T.accent, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {loading ? <RefreshCw size={16} className="animate-spin" /> : <><span>Verify and Connect Permanently</span><ArrowRight size={16} /></>}
                            </button>
                        </form>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '32px', background: T.card, textAlign: 'center' }}>
                        <RefreshCw size={36} color={T.accent} style={{ animation: 'spin 2s linear infinite', marginBottom: '24px' }} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>Syncing Database Reference Data</h3>
                        <p style={{ fontSize: '0.8rem', color: T.muted, marginBottom: '28px' }}>Connecting to Flaship Pakistan gateway endpoints...</p>

                        <div style={{ maxWidth: '360px', margin: '0 auto 24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 600 }}>
                                <span style={{ color: T.muted }}>Progress</span>
                                <span style={{ color: T.accent, fontSize: '0.9rem', fontWeight: 700 }}>{progressPercent}%</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                                <div
                                    style={{
                                        width: `${progressPercent}%`,
                                        height: '100%',
                                        backgroundColor: T.accent,
                                        borderRadius: '4px',
                                        transition: 'width 0.1s ease-out'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.8rem', color: T.fg, background: '#fff', border: `1px solid ${T.border}`, padding: '12px', borderRadius: '8px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.accent }} />
                            <span>{currentProgressText}</span>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '32px', background: T.card }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', color: '#10b981' }}>
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Active Connection Secured</h3>
                                <p style={{ fontSize: '0.8rem', color: T.muted }}>Blink N Ship is permanently connected to Flaship Pakistan.</p>
                            </div>
                        </div>

                        {accountInfo && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: '0.82rem' }}>
                                    <span style={{ color: T.muted }}>Account</span>
                                    <span style={{ fontWeight: 600, color: T.fg }}>{accountInfo.accountName || 'Flaship Account'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: '0.82rem' }}>
                                    <span style={{ color: T.muted }}>Provider</span>
                                    <span style={{ fontWeight: 600, color: T.fg }}>Flaship Pakistan</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: '0.82rem' }}>
                                    <span style={{ color: T.muted }}>Connected Since</span>
                                    <span style={{ fontWeight: 600, color: T.fg }}>{new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                            </div>
                        )}

                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px 16px', fontSize: '0.8rem', color: '#166534', lineHeight: 1.6 }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1, color: '#16a34a' }} />
                                <div>
                                    <strong style={{ fontSize: '0.82rem' }}>Permanently bound</strong>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>
                                        This Flaship account is now permanently linked to your Blink N Ship account.
                                        You can now access all CRM features including orders, inventory, ledger,
                                        dashboard, and reports. The connection is secure and cannot be changed from the UI.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 24, textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <a
                                    href="/dashboard"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                                        background: T.accent, color: '#fff', border: 'none', borderRadius: '8px',
                                        fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'none',
                                    }}
                                >
                                    Go to Dashboard
                                </a>
                                <a
                                    href="/orders"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                                        background: T.bg, color: T.fg, border: `1px solid ${T.border}`, borderRadius: '8px',
                                        fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'none',
                                    }}
                                >
                                    Start Booking
                                </a>
                            </div>
                        </div>
                    </div>
                )}
                </>
                )}
            </div>
        </motion.div>
    );
}