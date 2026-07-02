'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, RefreshCw } from 'lucide-react';

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
    const [settings, setSettings] = useState<any>({});
    const [companies, setCompanies] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form inputs
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
        ]).then(([sData, cData, lData]) => {
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
            setLoading(false);
        }).catch(() => setLoading(false));
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
                alert('Settings saved successfully');
            }
        } catch (e) {
            alert('Failed to save settings');
        } finally {
            setSaving(false);
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
                            <input type="number" value={bookingRetryCount} onChange={(e) => setBookingRetryCount(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${T.border}`, fontSize: '0.85rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>API Timeout (Secs)</label>
                            <input type="number" value={timeoutSeconds} onChange={(e) => setTimeoutSeconds(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${T.border}`, fontSize: '0.85rem' }} />
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
