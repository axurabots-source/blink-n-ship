'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

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

export default function PickupLocations() {
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [area, setArea] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const loadLocations = () => {
        setLoading(true);
        fetch('/api/courier/pickup-locations')
            .then(r => r.json())
            .then(data => {
                if (data.locations) setLocations(data.locations);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        loadLocations();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !city) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/courier/pickup-locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, contactPerson: contact, phone, address, city, area, isDefault
                }),
            });

            if (res.ok) {
                setShowForm(false);
                setName('');
                setContact('');
                setPhone('');
                setAddress('');
                setCity('');
                setArea('');
                setIsDefault(false);
                loadLocations();
            }
        } catch (e) {
            alert('Failed to add pickup location');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this pickup location?')) return;
        try {
            const res = await fetch(`/api/courier/pickup-locations/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadLocations();
            }
        } catch (e) {
            alert('Failed to delete location');
        }
    };

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }} className="bns-header">
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Pickup Locations</h1>
                    <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">Manage warehouse and office dispatch centers for parcel handovers.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: T.accent, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                >
                    <Plus size={16} />
                    <span>Add Location</span>
                </button>
            </div>

            {showForm && (
                <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '24px', background: T.card, marginBottom: '32px', maxWidth: '600px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Create Pickup Location</h3>
                    <form onSubmit={handleCreate}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }} className="bns-form-grid">
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: T.muted, marginBottom: '6px' }}>Location Name *</label>
                                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${T.border}`, fontSize: '0.85rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: T.muted, marginBottom: '6px' }}>Contact Person</label>
                                <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${T.border}`, fontSize: '0.85rem' }} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }} className="bns-form-grid">
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: T.muted, marginBottom: '6px' }}>Phone Number</label>
                                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${T.border}`, fontSize: '0.85rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: T.muted, marginBottom: '6px' }}>City *</label>
                                <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${T.border}`, fontSize: '0.85rem' }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: T.muted, marginBottom: '6px' }}>Address</label>
                            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${T.border}`, fontSize: '0.85rem' }} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                            <input type="checkbox" id="isDefault" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                            <label htmlFor="isDefault" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Set as default pickup location</label>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" disabled={submitting} style={{ padding: '10px 20px', background: T.accent, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Submit</button>
                            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', border: `1px solid ${T.border}`, background: '#fff', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Grid of locations */}
            {loading ? (
                <div style={{ padding: '20px', color: T.muted }}>Loading locations...</div>
            ) : locations.length === 0 ? (
                <div style={{ padding: '40px', border: `1px solid ${T.border}`, borderRadius: '12px', textAlign: 'center', color: T.muted }}>No dispatch centers configured yet. Add your first location.</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }} className="bns-grid">
                    {locations.map((loc) => (
                        <div key={loc.id} style={{ border: `1px solid ${T.border}`, padding: '24px', borderRadius: '12px', background: T.card, display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                            {loc.isDefault && (
                                <span style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', background: T.accentLight, color: T.accent, padding: '3px 8px', borderRadius: '20px' }}>
                                    Default
                                </span>
                            )}
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, paddingRight: '60px' }}>{loc.name}</h3>
                                <p style={{ fontSize: '0.8rem', color: T.muted, marginTop: '2px' }}>{loc.contactPerson || 'No contact person'}</p>
                            </div>
                            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ color: T.fg }}>{loc.address || 'No address provided'}</span>
                                <span style={{ color: T.muted }}>{loc.city}</span>
                                {loc.phone && <span style={{ color: T.muted, fontFamily: 'monospace' }}>{loc.phone}</span>}
                            </div>
                            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: '16px', marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => handleDelete(loc.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}>
                                    <Trash2 size={14} />
                                    <span>Delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
