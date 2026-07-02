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

    // Fetch existing connection on mount
    useEffect(() => {
        fetch('/api/courier/account')
            .then(r => r.json())
            .then(data => {
                if (data.account && data.meta) {
                    setAccountInfo(data.meta);
                    setStep(3);
                }
            })
            .catch(() => {});
    }, []);

    async function handleConnect(e: React.FormEvent) {
        e.preventDefault();
        if (!apiKey.trim()) return;

        setLoading(true);
        setError(null);
        setStep(2);
        setSyncProgress(['Authenticating credentials...']);

        try {
            const res = await fetch('/api/courier/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Connection failed');

            setSyncProgress(prev => [...prev, 'Fetching pickup locations...']);
            await new Promise(r => setTimeout(r, 600));

            setSyncProgress(prev => [...prev, 'Mapping operational cities...']);
            await new Promise(r => setTimeout(r, 600));

            setSyncProgress(prev => [...prev, 'Caching service rates...']);
            await new Promise(r => setTimeout(r, 800));

            setAccountInfo(data.account);
            setStep(3);
        } catch (err: any) {
            setError(err.message);
            setStep(1);
        } finally {
            setLoading(false);
        }
    }

    async function handleDisconnect() {
        if (!confirm('Are you sure you want to disconnect your Flaship account? This will halt courier sync.')) return;
        setLoading(true);
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
                                    type="password"
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
                        <p style={{ fontSize: '0.8rem', color: T.muted, marginBottom: '24px' }}>Connecting to Flaship Pakistan gateway endpoints...</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: '0 auto', textAlign: 'left', background: '#fff', border: `1px solid ${T.border}`, padding: '16px', borderRadius: '8px', fontSize: '0.8rem' }}>
                            {syncProgress.map((prog, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: idx === syncProgress.length - 1 ? T.fg : T.muted }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: idx === syncProgress.length - 1 ? T.accent : T.border }} />
                                    <span>{prog}</span>
                                </div>
                            ))}
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

                        <button
                            onClick={handleDisconnect}
                            style={{ width: '100%', padding: '12px', background: 'none', border: `1px solid ${T.border}`, color: '#ef4444', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s ease' }}
                        >
                            Disconnect Gateway Token
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

