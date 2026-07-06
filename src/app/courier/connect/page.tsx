'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, ShieldCheck, RefreshCw, AlertCircle, ArrowRight, CheckCircle2, Edit2, Check, X } from 'lucide-react';

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
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Input key, 2: Syncing details, 3: Success
    const [error, setError] = useState<string | null>(null);
    const [syncProgress, setSyncProgress] = useState<string[]>([]);
    const [accountInfo, setAccountInfo] = useState<any>(null);

    // Editing states
    const [editingField, setEditingField] = useState<'name' | 'balance' | null>(null);
    const [editValue, setEditValue] = useState('');

    const [progressPercent, setProgressPercent] = useState(0);
    const [currentProgressText, setCurrentProgressText] = useState('Securing API credentials connection...');
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [confirmDisconnect, setConfirmDisconnect] = useState(false);

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
            .catch(() => {})
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

        // Start progress percentage simulation
        const startTime = Date.now();
        const duration = 4000; // Expected approximate connect time
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


    async function handleDisconnect() {
        setLoading(true);
        setConfirmDisconnect(false);
        try {
            const res = await fetch('/api/courier/account', { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to disconnect');
            setStep(1);
            setApiKey('');
            setAccountInfo(null);
        } catch (e: any) {
            alert(e.message || 'Failed to disconnect');
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
                                {loading ? <RefreshCw size={16} className="animate-spin" /> : <><span>Verify and Connect</span><ArrowRight size={16} /></>}
                            </button>
                        </form>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '32px', background: T.card, textAlign: 'center' }}>
                        <RefreshCw size={36} color={T.accent} style={{ animation: 'spin 2s linear infinite', marginBottom: '24px' }} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>Syncing Database Reference Data</h3>
                        <p style={{ fontSize: '0.8rem', color: T.muted, marginBottom: '28px' }}>Connecting to Flaship Pakistan gateway endpoints...</p>
                        
                        {/* Progress Bar & Percentage Counter */}
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
                                <p style={{ fontSize: '0.8rem', color: T.muted }}>Blink N Ship is connected to Flaship Pakistan.</p>
                            </div>
                        </div>

                        {!confirmDisconnect ? (
                            <button
                                onClick={() => setConfirmDisconnect(true)}
                                style={{ width: '100%', padding: '12px', background: 'none', border: `1px solid ${T.border}`, color: '#ef4444', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s ease' }}
                            >
                                Disconnect Gateway Token
                            </button>
                        ) : (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', marginTop: '12px' }}>
                                <p style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: 600, margin: '0 0 12px 0', textAlign: 'center' }}>
                                    Are you sure you want to disconnect? This will halt courier synchronization.
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={handleDisconnect}
                                        disabled={loading}
                                        style={{ flex: 1, padding: '10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                                    >
                                        {loading ? 'Disconnecting...' : 'Yes, Disconnect'}
                                    </button>
                                    <button
                                        onClick={() => setConfirmDisconnect(false)}
                                        disabled={loading}
                                        style={{ flex: 1, padding: '10px', background: '#fff', border: `1px solid ${T.border}`, color: T.muted, borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                </>
                )}
            </div>
        </motion.div>
    );
}

