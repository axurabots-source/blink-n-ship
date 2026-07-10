'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
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

export default function CourierSettings() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<any>({});
    const [companies, setCompanies] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [connectionInfo, setConnectionInfo] = useState<any>(null);

    const [defaultCompanyId, setDefaultCompanyId] = useState('');
    const [defaultPickupId, setDefaultPickupId] = useState('');
    const [defaultServiceType, setDefaultServiceType] = useState('overnight');
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
    const [bookingRetryCount, setBookingRetryCount] = useState(3);
    const [timeoutSeconds, setTimeoutSeconds] = useState(30);

    useEffect(() => {
        Promise.all([
            fetch('/api/courier/settings').then(r => r.json()),
            fetch('/api/courier/companies').then(r => r.json()),
            fetch('/api/courier/pickup-locations').then(r => r.json()),
            fetch('/api/courier/account').then(r => r.json()),
        ]).then(([sData, cData, lData, aData]) => {
            if (sData.settings) {
                setSettings(sData.settings);
                setDefaultCompanyId(sData.settings.defaultCompanyId || '');
                setDefaultPickupId(sData.settings.defaultPickupId || '');
                setDefaultServiceType(sData.settings.defaultServiceType || 'overnight');
                setAutoSyncEnabled(sData.settings.autoSyncEnabled || false);
                setBookingRetryCount(sData.settings.bookingRetryCount || 3);
                setTimeoutSeconds(sData.settings.timeoutSeconds || 30);
            }
            if (cData.companies) setCompanies(cData.companies);
            if (lData.locations) setLocations(lData.locations);
            if (aData.account) setConnectionInfo(aData.account);
            setLoading(false);
        }).catch(() => { setLoading(false); toast('error', 'Failed to load data'); });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/courier/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    defaultCompanyId,
                    defaultPickupId,
                    defaultServiceType,
                    autoSyncEnabled,
                    bookingRetryCount: Number(bookingRetryCount),
                    timeoutSeconds: Number(timeoutSeconds),
                }),
            });
            if (res.ok) {
                toast('success', 'Settings saved successfully');
            }
        } catch (e) {
            toast('error', 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/courier/account');
            const data = await res.json();
            if (data.account && data.meta) {
                setTestResult({ success: true, message: 'Connection verified. API is responding correctly.' });
            } else {
                setTestResult({ success: false, message: 'Connection record found but unable to verify API status.' });
            }
        } catch {
            setTestResult({ success: false, message: 'Could not reach the courier service. The connection may be temporarily unavailable.' });
        } finally {
            setTesting(false);
        }
    };

    if (loading) return <div style={{ padding: '40px 48px' }}>Loading settings...</div>;

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
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Courier Settings</h1>
                <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">Configure default carriers, dispatch parameters, and automatic tracking intervals.</p>
            </div>

            {/* Connection Status Card */}
            {connectionInfo && (
                <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '24px', background: T.card, maxWidth: '600px', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', color: '#10b981' }}>
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Connection Status</h3>
                            <p style={{ fontSize: '0.78rem', color: T.muted, margin: '2px 0 0' }}>
                                Permanently connected to Flaship Pakistan
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: '0.82rem' }}>
                            <span style={{ color: T.muted }}>Status</span>
                            <span style={{ fontWeight: 600, color: '#16a34a' }}>Connected</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: '0.82rem' }}>
                            <span style={{ color: T.muted }}>Provider</span>
                            <span style={{ fontWeight: 600, color: T.fg }}>Flaship Pakistan</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: '0.82rem' }}>
                            <span style={{ color: T.muted }}>Connected Since</span>
                            <span style={{ fontWeight: 600, color: T.fg }}>
                                {connectionInfo.connectedAt
                                    ? new Date(connectionInfo.connectedAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })
                                    : '—'}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleTestConnection}
                        disabled={testing}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                            background: T.bg, color: T.fg, border: `1px solid ${T.border}`,
                            borderRadius: 8, fontWeight: 600, fontSize: '0.82rem', cursor: testing ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {testing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        {testing ? 'Testing...' : 'Test Connection'}
                    </button>

                    {testResult && (
                        <div style={{
                            display: 'flex', gap: 10, padding: '12px 14px', marginTop: 12,
                            background: testResult.success ? '#f0fdf4' : '#fef2f2',
                            border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
                            borderRadius: 8, fontSize: '0.8rem',
                            color: testResult.success ? '#166534' : '#dc2626',
                        }}>
                            {testResult.success ? <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />}
                            <span>{testResult.message}</span>
                        </div>
                    )}

                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px', marginTop: 16, fontSize: '0.78rem', color: '#166534', display: 'flex', gap: 8 }}>
                        <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>This connection is permanently bound and cannot be disconnected from the UI.</span>
                    </div>
                </div>
            )}

            <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '32px', background: T.card, maxWidth: '600px' }}>
                <form onSubmit={handleSave}>
                    {/* Default Courier Company */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Default Courier Carrier</label>
                        <select
                            value={defaultCompanyId}
                            onChange={(e) => setDefaultCompanyId(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: `1px solid ${T.border}`, fontSize: '0.85rem', outline: 'none' }}
                        >
                            <option value="">Select a default carrier...</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {/* Default Pickup Warehouse */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Default Dispatch Center</label>
                        <select
                            value={defaultPickupId}
                            onChange={(e) => setDefaultPickupId(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: `1px solid ${T.border}`, fontSize: '0.85rem', outline: 'none' }}
                        >
                            <option value="">Select a default warehouse...</option>
                            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>

                    {/* Default Service Type */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Default Service Mode</label>
                        <select
                            value={defaultServiceType}
                            onChange={(e) => setDefaultServiceType(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: `1px solid ${T.border}`, fontSize: '0.85rem', outline: 'none' }}
                        >
                            <option value="overnight">Overnight Delivery</option>
                            <option value="overland">Overland Cargo</option>
                            <option value="detain">Detain / Self Collection</option>
                        </select>
                    </div>

                    {/* Auto Sync Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', padding: '12px 16px', border: `1px solid ${T.border}`, borderRadius: '8px', background: '#fff' }}>
                        <input
                            type="checkbox"
                            id="autoSync"
                            checked={autoSyncEnabled}
                            onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                        />
                        <label htmlFor="autoSync" style={{ fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>Enable automatic tracking status synchronization</label>
                    </div>

                    {/* Numbers */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }} className="bns-form-grid">
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Booking Retry Count</label>
                            <input type="number" inputMode="numeric" value={bookingRetryCount} onChange={(e) => setBookingRetryCount(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${T.border}`, fontSize: '0.85rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>API Timeout (Secs)</label>
                            <input type="number" inputMode="numeric" value={timeoutSeconds} onChange={(e) => setTimeoutSeconds(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${T.border}`, fontSize: '0.85rem' }} />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: T.accent, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s ease' }}
                    >
                        {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                        <span>Save Preferences</span>
                    </button>
                </form>
            </div>
        </motion.div>
    );
}