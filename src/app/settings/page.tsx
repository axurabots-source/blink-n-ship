'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/components/Toast';
import {
  Settings, Users, Bell, Shield, Clock, Building2, Mail, Phone, MapPin,
  Globe, User, Lock, LogOut, Plus, X, Search, ChevronDown, Check,
  Loader2, Eye, EyeOff, Smartphone, Laptop, Monitor, AlertTriangle,
  Ban, CheckCircle, Pencil, Trash2, ExternalLink, RefreshCw,
} from 'lucide-react';

const T = {
  bg: '#f8f6f4',
  fg: '#1a1a1a',
  accent: '#CC785C',
  accentHover: '#b8654a',
  accentLight: '#fef0ea',
  border: '#e5e0dc',
  muted: '#8a8a8a',
  card: '#ffffff',
  inputBg: '#f5f3f1',
};

const SETTINGS_TABS = [
  { id: 'profile', label: 'Company Profile', icon: Building2 },
  { id: 'team', label: 'Team Management', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'activity', label: 'Activity Logs', icon: Clock },
];

const PERMISSION_MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'orders', label: 'Orders / Booking' },
  { id: 'products', label: 'Products / Inventory' },
  { id: 'ledger', label: 'Ledger / Reports' },
  { id: 'settings', label: 'Settings' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const renderTabContent = useMemo(() => {
    switch (activeTab) {
      case 'profile': return <CompanyProfileTab />;
      case 'team': return <TeamManagementTab />;
      case 'notifications': return <NotificationsTab />;
      case 'security': return <SecurityTab />;
      case 'activity': return <ActivityLogsTab />;
      default: return null;
    }
  }, [activeTab]);

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh', background: T.bg, fontFamily: 'var(--font-geist-sans), sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: T.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={18} color={T.accent} strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: T.fg, margin: 0 }}>Settings</h1>
            <p style={{ fontSize: '0.8rem', color: T.muted, margin: '2px 0 0' }}>Manage your account and preferences</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 0, flexDirection: 'column' as const, marginBottom: 24, borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.border}`, background: T.card }}>
          <div className="bns-settings-tabs" style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {SETTINGS_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '14px 22px',
                    fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap',
                    border: 'none', borderBottom: isActive ? `2px solid ${T.accent}` : '2px solid transparent',
                    background: isActive ? T.accentLight : 'transparent',
                    color: isActive ? T.accent : T.muted, cursor: 'pointer',
                    transition: 'all 0.15s ease', flex: '0 0 auto',
                  }}
                >
                  <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="bns-tab-label">{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div style={{ padding: 28 }}>
            {renderTabContent}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .bns-settings-tabs { overflow-x: auto; gap: 0; }
          .bns-settings-tabs button { padding: 12px 14px; font-size: 0.78rem; }
          .bns-tab-label { display: none; }
        }
        @keyframes bns-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function CompanyProfileTab() {
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/settings/profile').then(r => r.json()).then(d => {
      if (d.profile) setProfile(d.profile);
    }).catch(() => setError('Failed to load profile'));
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true); setSaved(false); setError('');
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: profile.businessName,
          email: profile.email,
          phone: profile.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(data.profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${T.accentLight}`, borderTopColor: T.accent, animation: 'bns-spin 0.6s linear infinite' }} />
        <span style={{ fontSize: '0.82rem', color: T.muted }}>Loading profile...</span>
      </div>
    );
  }

  const updateField = (key: string, value: string) => setProfile((prev: any) => ({ ...prev, [key]: value }));

  function formRow(label: string, icon: any, key: string, type = 'text', readOnly = false, placeholder = '') {
    const Icon = icon;
    const inputId = `profile-${key}`;
    const inputModeAttr = type === 'email' ? 'email' as const : type === 'tel' ? 'tel' as const : undefined;
    const autoCompleteAttr = type === 'email' ? 'email' : type === 'tel' ? 'tel' : key === 'name' ? 'name' : key === 'address' ? 'street-address' : key === 'website' ? 'url' : undefined;
    return (
      <div style={{ marginBottom: 18 }}>
        <label htmlFor={inputId} style={{ fontSize: '0.72rem', fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</label>
        <div style={{ position: 'relative' }}>
          <Icon size={14} color={T.muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} aria-hidden="true" />
          {readOnly ? (
            <div id={inputId} style={{ padding: '10px 12px 10px 38px', fontSize: '0.85rem', color: T.fg, background: T.inputBg, borderRadius: 10, border: `1px solid ${T.border}`, userSelect: 'none' }}>{profile[key] || '—'}</div>
          ) : (
            <input
              id={inputId}
              type={type}
              inputMode={inputModeAttr}
              autoComplete={autoCompleteAttr}
              value={profile[key] || ''}
              onChange={e => updateField(key, e.target.value)}
              placeholder={placeholder}
              style={{ width: '100%', padding: '10px 12px 10px 38px', fontSize: '0.85rem', color: T.fg, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box' }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: T.fg, margin: '0 0 4px' }}>Company Profile</h2>
      <p style={{ fontSize: '0.8rem', color: T.muted, margin: '0 0 24px' }}>Manage your business information visible across the platform.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {formRow('Business Name', Building2, 'businessName', 'text', false, 'Your business name')}
        {formRow('Email Address', Mail, 'email', 'email', false, 'owner@example.com')}
        {formRow('Phone Number', Phone, 'phone', 'tel', false, '+92 300 1234567')}
      </div>

      {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: '0.8rem', marginTop: 16 }}>{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
        <button onClick={handleSave} disabled={saving} style={{
          display: 'flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff', border: 'none',
          borderRadius: 10, padding: '10px 24px', fontSize: '0.85rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.6 : 1,
        }}>
          {saving ? <Loader2 size={15} className="bns-spin" /> : <Check size={15} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 500 }}>Profile updated successfully</span>}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .bns-profile-grid { grid-template-columns: 1fr !important; }
          .bns-profile-grid > div { grid-column: span 1 !important; }
        }
        .bns-spin { animation: bns-spin 0.6s linear infinite; }
      `}</style>
    </div>
  );
}

function TeamManagementTab() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <Users size={48} color={T.muted} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: T.fg, margin: '0 0 8px' }}>Coming Soon</h2>
      <p style={{ fontSize: '0.85rem', color: T.muted, margin: '0 auto', maxWidth: 360 }}>
        Team management is under development. You will be able to invite members and assign permissions here.
      </p>
    </div>
  );
}

function InviteForm({ onInvite, onCancel, saving }: { onInvite: (data: any) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'employee' });

  return (
    <div style={{ padding: 20, background: T.card, borderRadius: 12, border: `1px solid ${T.accent}`, marginBottom: 16 }}>
      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: T.fg, margin: '0 0 16px' }}>Invite Team Member</h3>
      <div className="bns-invite-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <input placeholder="Full name" autoComplete="name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={{ padding: '10px 12px', fontSize: '0.85rem', border: `1px solid ${T.border}`, borderRadius: 10, outline: 'none', background: T.bg, color: T.fg }} />
        <input placeholder="Email address" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={{ padding: '10px 12px', fontSize: '0.85rem', border: `1px solid ${T.border}`, borderRadius: 10, outline: 'none', background: T.bg, color: T.fg }} />
        <input placeholder="Phone (optional)" inputMode="tel" autoComplete="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={{ padding: '10px 12px', fontSize: '0.85rem', border: `1px solid ${T.border}`, borderRadius: 10, outline: 'none', background: T.bg, color: T.fg }} />
        <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{ padding: '10px 12px', fontSize: '0.85rem', border: `1px solid ${T.border}`, borderRadius: 10, outline: 'none', background: T.bg, color: T.fg, cursor: 'pointer' }}>
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={() => onInvite(form)} disabled={saving || !form.name || !form.email} style={{
          display: 'flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff', border: 'none',
          borderRadius: 10, padding: '9px 20px', fontSize: '0.82rem', fontWeight: 600, cursor: (saving || !form.name || !form.email) ? 'not-allowed' : 'pointer', opacity: (saving || !form.name || !form.email) ? 0.6 : 1,
        }}>
          {saving ? <Loader2 size={14} className="bns-spin" /> : <Plus size={14} />}
          {saving ? 'Inviting...' : 'Send Invite'}
        </button>
        <button onClick={onCancel} disabled={saving} style={{ border: `1px solid ${T.border}`, background: T.bg, color: T.muted, borderRadius: 10, padding: '9px 20px', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function EditMemberForm({ member, onSave, onCancel, saving }: { member: any; onSave: (id: string, data: any) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState({ name: member.name, email: member.email, phone: member.phone || '', role: member.role, status: member.status });

  return (
    <div style={{ padding: 20, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 16 }}>
      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: T.fg, margin: '0 0 16px' }}>Edit Team Member</h3>
      <div className="bns-invite-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <input placeholder="Full name" autoComplete="name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={{ padding: '10px 12px', fontSize: '0.85rem', border: `1px solid ${T.border}`, borderRadius: 10, outline: 'none', background: T.bg, color: T.fg }} />
        <input placeholder="Email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={{ padding: '10px 12px', fontSize: '0.85rem', border: `1px solid ${T.border}`, borderRadius: 10, outline: 'none', background: T.bg, color: T.fg }} />
        <input placeholder="Phone" inputMode="tel" autoComplete="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={{ padding: '10px 12px', fontSize: '0.85rem', border: `1px solid ${T.border}`, borderRadius: 10, outline: 'none', background: T.bg, color: T.fg }} />
        <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{ padding: '10px 12px', fontSize: '0.85rem', border: `1px solid ${T.border}`, borderRadius: 10, outline: 'none', background: T.bg, color: T.fg, cursor: 'pointer' }}>
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={{ padding: '10px 12px', fontSize: '0.85rem', border: `1px solid ${T.border}`, borderRadius: 10, outline: 'none', background: T.bg, color: T.fg, cursor: 'pointer' }}>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="invited">Invited</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={() => onSave(member.id, form)} disabled={saving} style={{
          display: 'flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff', border: 'none',
          borderRadius: 10, padding: '9px 20px', fontSize: '0.82rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
        }}>
          {saving ? <Loader2 size={14} className="bns-spin" /> : <Check size={14} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button onClick={onCancel} style={{ border: `1px solid ${T.border}`, background: T.bg, color: T.muted, borderRadius: 10, padding: '9px 20px', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function PermissionsForm({ member, onSave, onCancel, saving }: { member: any; onSave: (id: string, perms: any[]) => void; onCancel: () => void; saving: boolean }) {
  const [permissions, setPermissions] = useState<any[]>(
    member.permissions?.length > 0
      ? member.permissions
      : PERMISSION_MODULES.map(m => ({ module: m.id, canView: false, canViewFinancial: false, canCreate: false, canRead: false, canUpdate: false, canDelete: false }))
  );

  const updatePerm = (module: string, key: string, value: boolean) => {
    setPermissions(prev => prev.map(p => p.module === module ? { ...p, [key]: value } : p));
  };

  const toggleAll = (value: boolean) => {
    setPermissions(prev => prev.map(p => ({ ...p, canView: value, canCreate: value, canRead: value, canUpdate: value, canDelete: value })));
  };

  return (
    <div style={{ padding: 20, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: T.fg, margin: 0 }}>Permissions: {member.name}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => toggleAll(true)} style={{ border: `1px solid ${T.border}`, background: T.bg, color: T.fg, borderRadius: 6, padding: '4px 12px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>All Access</button>
          <button onClick={() => toggleAll(false)} style={{ border: `1px solid ${T.border}`, background: T.bg, color: T.muted, borderRadius: 6, padding: '4px 12px', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer' }}>None</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: T.fg, whiteSpace: 'nowrap' }}>Module</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 500, color: T.muted, whiteSpace: 'nowrap' }}>Access</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 500, color: T.muted, whiteSpace: 'nowrap' }}>Financial</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 500, color: T.muted, whiteSpace: 'nowrap' }}>Create</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 500, color: T.muted, whiteSpace: 'nowrap' }}>Read</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 500, color: T.muted, whiteSpace: 'nowrap' }}>Update</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 500, color: T.muted, whiteSpace: 'nowrap' }}>Delete</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map(perm => {
              const mod = PERMISSION_MODULES.find(m => m.id === perm.module);
              return (
                <tr key={perm.module} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: T.fg }}>{mod?.label || perm.module}</td>
                  {['canView', 'canViewFinancial', 'canCreate', 'canRead', 'canUpdate', 'canDelete'].map(key => (
                    <td key={key} style={{ textAlign: 'center', padding: '8px 4px' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, cursor: 'pointer' }}>
                        <input type="checkbox" checked={(perm as any)[key] ?? false} onChange={e => updatePerm(perm.module, key, e.target.checked)} style={{ accentColor: T.accent, width: 16, height: 16, cursor: 'pointer' }} />
                      </label>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={() => onSave(member.id, permissions)} disabled={saving} style={{
          display: 'flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff', border: 'none',
          borderRadius: 10, padding: '9px 20px', fontSize: '0.82rem', fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
        }}>
          {saving ? <Loader2 size={14} className="bns-spin" /> : <Check size={14} />}
          {saving ? 'Saving...' : 'Save Permissions'}
        </button>
        <button onClick={onCancel} style={{ border: `1px solid ${T.border}`, background: T.bg, color: T.muted, borderRadius: 10, padding: '9px 20px', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings/notifications').then(r => r.json()).then(d => {
      if (d.preferences) setPrefs(d.preferences);
    }).catch(() => setPrefs({}));
  }, []);

  const toggle = async (key: string) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try {
      await fetch('/api/settings/notifications', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: updated[key] }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { toast('error', 'Failed to save notification preferences'); } finally { setSaving(false); }
  };

  if (!prefs) return <div style={{ textAlign: 'center', padding: 40, color: T.muted, fontSize: '0.85rem' }}>Loading...</div>;

  const groups = [
    {
      title: 'Order Events', items: [
        { key: 'orderBooked', label: 'Order Booked', desc: 'When an order is successfully booked' },
        { key: 'orderDelivered', label: 'Order Delivered', desc: 'When an order is marked as delivered' },
        { key: 'orderReturned', label: 'Order Returned', desc: 'When an order is returned' },
        { key: 'bookingFailed', label: 'Booking Failed', desc: 'When a booking attempt fails' },
      ],
    },
    {
      title: 'System Alerts', items: [
        { key: 'lowStock', label: 'Low Stock Warning', desc: 'When inventory stock is running low' },
        { key: 'employeeLogin', label: 'Employee Login', desc: 'When a team member logs in' },
        { key: 'permissionChange', label: 'Permission Changes', desc: 'When employee permissions are modified' },
      ],
    },
    {
      title: 'Summary Reports', items: [
        { key: 'dailySummary', label: 'Daily Summary', desc: 'End-of-day performance summary' },
        { key: 'weeklySummary', label: 'Weekly Summary', desc: 'End-of-week performance report' },
        { key: 'monthlySummary', label: 'Monthly Summary', desc: 'End-of-month performance report' },
      ],
    },
  ];

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: T.fg, margin: '0 0 4px' }}>Notification Preferences</h2>
      <p style={{ fontSize: '0.8rem', color: T.muted, margin: '0 0 24px' }}>Configure which events you want to be notified about.</p>

      {groups.map(group => (
        <div key={group.title} style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '0.78rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px' }}>{group.title}</h3>
          <div style={{ background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            {group.items.map((item, idx) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: idx < group.items.length - 1 ? `1px solid ${T.border}` : 'none', gap: 12 }}>
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: T.fg, margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: '0.75rem', color: T.muted, margin: '2px 0 0' }}>{item.desc}</p>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
                  <input type="checkbox" checked={(prefs as any)[item.key] ?? false} onChange={() => toggle(item.key)} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 24,
                    background: (prefs as any)[item.key] ? T.accent : T.border,
                    transition: 'background 0.2s',
                  }}>
                    <span style={{
                      position: 'absolute', left: (prefs as any)[item.key] ? 22 : 2, top: 2,
                      width: 20, height: 20, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    }} />
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      ))}

      {saved && <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 500 }}>Preferences saved</span>}
      <p style={{ fontSize: '0.75rem', color: T.muted, marginTop: 16, fontStyle: 'italic' }}>Architecture ready for Email, SMS, WhatsApp, and Push notification delivery channels.</p>
    </div>
  );
}

function DeleteAccountSection() {
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true); setDeleteError('');
    try {
      const res = await fetch('/api/settings/security/delete-account', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');
      window.location.href = '/login';
    } catch (err: any) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  return (
    <div style={{ background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca', padding: 20 }}>
      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#dc2626', margin: '0 0 4px' }}>Delete Account</p>
      <p style={{ fontSize: '0.75rem', color: '#b91c1c', margin: '0 0 4px' }}>
        Permanently delete your Blink N Ship account and all associated data including:
        orders, products, courier connection, team members, and settings.
      </p>
      <p style={{ fontSize: '0.72rem', color: '#991b1b', margin: '0 0 16px' }}>
        This action is irreversible. Your courier account binding will also be removed.
      </p>
      {!showDelete ? (
        <button
          onClick={() => setShowDelete(true)}
          style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Delete Account
        </button>
      ) : (
        <div>
          <p style={{ fontSize: '0.78rem', color: '#991b1b', marginBottom: 8, fontWeight: 500 }}>
            Type <strong>DELETE</strong> to confirm:
          </p>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Type DELETE"
            style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem', border: '1px solid #fecaca', borderRadius: 8, outline: 'none', background: '#fff', color: T.fg, boxSizing: 'border-box', marginBottom: 12 }}
          />
          {deleteError && <p style={{ fontSize: '0.78rem', color: '#dc2626', marginBottom: 8 }}>{deleteError}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDelete}
              disabled={deleteConfirmText !== 'DELETE' || deleting}
              style={{
                flex: 1, padding: '10px', background: deleteConfirmText === 'DELETE' ? '#dc2626' : '#e5e5e5',
                color: deleteConfirmText === 'DELETE' ? '#fff' : T.muted, border: 'none', borderRadius: 8,
                fontWeight: 600, fontSize: '0.8rem', cursor: deleteConfirmText === 'DELETE' && !deleting ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {deleting ? <Loader2 size={14} className="bns-spin" /> : null}
              {deleting ? 'Deleting...' : 'Permanently Delete'}
            </button>
            <button
              onClick={() => { setShowDelete(false); setDeleteConfirmText(''); setDeleteError(''); }}
              disabled={deleting}
              style={{ flex: 1, padding: '10px', background: '#fff', border: '1px solid #e5e5e5', color: T.muted, borderRadius: 8, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SecurityTab() {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [newEmail, setNewEmail] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings/security/sessions').then(r => r.json()).then(d => {
      if (d.sessions) setSessions(d.sessions);
    }).catch(() => setSessions([])).finally(() => setSessionsLoading(false));
  }, []);

  const handleChangePassword = async () => {
    if (passwords.newPass !== passwords.confirm) { setError('Passwords do not match'); return; }
    if (passwords.newPass.length < 6) { setError('Password must be at least 6 characters'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/settings/security/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.newPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Password changed successfully');
      setPasswords({ current: '', newPass: '', confirm: '' });
      setShowPasswordForm(false);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleChangeEmail = async () => {
    if (!newEmail) { setError('Enter a new email address'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/settings/security/change-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Verification email sent to new address');
      setNewEmail('');
      setShowEmailForm(false);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleLogoutOthers = async () => {
    if (!confirm('This will sign out all other active sessions. Continue?')) return;
    setSaving(true);
    try {
      await fetch('/api/settings/security/sessions/logout-others', { method: 'POST' });
      setSuccess('Other sessions signed out');
    } catch {} finally { setSaving(false); }
  };

  const pwInput = (label: string, value: string, show: boolean, toggle: (v: boolean) => void, key: string) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: T.muted, display: 'block', marginBottom: 4 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input type={show ? 'text' : 'password'} value={value} onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))} style={{ width: '100%', padding: '10px 40px 10px 12px', fontSize: '0.85rem', border: `1px solid ${T.border}`, borderRadius: 10, outline: 'none', background: T.bg, color: T.fg, boxSizing: 'border-box' }} />
        <button type="button" onClick={() => toggle(!show)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 0 }}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: T.fg, margin: '0 0 4px' }}>Security</h2>
      <p style={{ fontSize: '0.8rem', color: T.muted, margin: '0 0 24px' }}>Manage your password, email, and active sessions.</p>

      {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: '0.8rem', marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#16a34a', fontSize: '0.8rem', marginBottom: 16 }}>{success}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showPasswordForm ? 16 : 0 }}>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: T.fg, margin: 0 }}>Password</p>
              <p style={{ fontSize: '0.75rem', color: T.muted, margin: '2px 0 0' }}>Last changed: —</p>
            </div>
            <button onClick={() => { setShowPasswordForm(!showPasswordForm); setShowEmailForm(false); }} style={{ border: `1px solid ${T.border}`, background: T.bg, color: T.fg, borderRadius: 8, padding: '7px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
              {showPasswordForm ? 'Cancel' : 'Change Password'}
            </button>
          </div>
          {showPasswordForm && (
            <div>
              {pwInput('Current Password', passwords.current, showCurrent, setShowCurrent, 'current')}
              {pwInput('New Password', passwords.newPass, showNew, setShowNew, 'newPass')}
              {pwInput('Confirm New Password', passwords.confirm, showConfirm, setShowConfirm, 'confirm')}
              <button onClick={handleChangePassword} disabled={saving} style={{
                display: 'flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff', border: 'none',
                borderRadius: 10, padding: '9px 20px', fontSize: '0.82rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              }}>
                {saving ? <Loader2 size={14} className="bns-spin" /> : <Lock size={14} />}
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          )}
        </div>

        <div style={{ background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: T.fg, margin: 0 }}>Email Address</p>
              <p style={{ fontSize: '0.75rem', color: T.muted, margin: '2px 0 0' }}>Change your login email</p>
            </div>
            <button onClick={() => { setShowEmailForm(!showEmailForm); setShowPasswordForm(false); }} style={{ border: `1px solid ${T.border}`, background: T.bg, color: T.fg, borderRadius: 8, padding: '7px 16px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
              {showEmailForm ? 'Cancel' : 'Change Email'}
            </button>
          </div>
          {showEmailForm && (
            <div style={{ marginTop: 16 }}>
              <input type="email" placeholder="New email address" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem', border: `1px solid ${T.border}`, borderRadius: 10, outline: 'none', background: T.bg, color: T.fg, boxSizing: 'border-box', marginBottom: 12 }} />
              <button onClick={handleChangeEmail} disabled={saving} style={{
                display: 'flex', alignItems: 'center', gap: 8, background: T.accent, color: '#fff', border: 'none',
                borderRadius: 10, padding: '9px 20px', fontSize: '0.82rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              }}>
                {saving ? <Loader2 size={14} className="bns-spin" /> : <Mail size={14} />}
                {saving ? 'Sending...' : 'Send Verification'}
              </button>
            </div>
          )}
        </div>

        <div style={{ background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: T.fg, margin: '0 0 4px' }}>Active Sessions</p>
          <p style={{ fontSize: '0.75rem', color: T.muted, margin: '0 0 16px' }}>Devices and browsers currently signed into your account.</p>
          {sessionsLoading ? (
            <div style={{ textAlign: 'center', padding: 20, color: T.muted, fontSize: '0.8rem' }}>Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: T.muted, fontSize: '0.8rem' }}>No active sessions found</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map(session => {
                const DeviceIcon = session.device?.toLowerCase().includes('mobile') || session.device?.toLowerCase().includes('phone') ? Smartphone :
                  session.device?.toLowerCase().includes('tablet') ? Monitor : Laptop;
                return (
                  <div key={session.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: T.card, borderRadius: 8, border: `1px solid ${T.border}` }}>
                    <DeviceIcon size={16} color={session.isCurrent ? T.accent : T.muted} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: T.fg, margin: 0 }}>
                        {session.browserInfo || 'Unknown browser'}
                        {session.isCurrent && <span style={{ color: T.accent, fontWeight: 700, marginLeft: 6 }}>(Current)</span>}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: T.muted, margin: '2px 0 0' }}>
                        {[session.os, session.device, session.ipAddress].filter(Boolean).join(' · ') || 'Unknown device'}
                        {' · '}Last active: {new Date(session.lastActiveAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {sessions.length > 1 && (
            <button onClick={handleLogoutOthers} disabled={saving} style={{
              display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
              borderRadius: 8, padding: '9px 18px', fontSize: '0.8rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', marginTop: 16, opacity: saving ? 0.6 : 1,
            }}>
              <LogOut size={14} /> Sign Out Other Devices
            </button>
          )}
        </div>

        <div style={{ background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: T.fg, margin: '0 0 4px' }}>Two-Factor Authentication</p>
          <p style={{ fontSize: '0.75rem', color: T.muted, margin: 0 }}>Architecture prepared for TOTP, SMS, and authenticator app based 2FA. Not yet implemented.</p>
        </div>

        <DeleteAccountSection />
      </div>
    </div>
  );
}

function ActivityLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterModule, setFilterModule] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '25' });
      if (filterModule) params.set('module', filterModule);
      if (filterUser) params.set('userId', filterUser);
      const res = await fetch(`/api/settings/activity-logs?${params}`);
      const data = await res.json();
      if (data.logs) { setLogs(data.logs); setTotalPages(data.pagination.totalPages); }
    } catch {} finally { setLoading(false); }
  }, [filterModule, filterUser]);

  useEffect(() => { fetchLogs(page); }, [page, fetchLogs]);

  const actionIcon = (action: string) => {
    switch (action) {
      case 'created': case 'invited': return <CheckCircle size={13} color="#16a34a" />;
      case 'deleted': return <Trash2 size={13} color="#dc2626" />;
      case 'suspended': return <Ban size={13} color="#dc2626" />;
      case 'activated': return <CheckCircle size={13} color="#16a34a" />;
      case 'updated': return <Pencil size={13} color="#ca8a04" />;
      default: return <Clock size={13} color={T.muted} />;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: T.fg, margin: '0 0 4px' }}>Activity Logs</h2>
          <p style={{ fontSize: '0.8rem', color: T.muted, margin: 0 }}>Audit trail of important business events.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filterModule} onChange={e => { setFilterModule(e.target.value); setPage(1); }} style={{ padding: '8px 12px', fontSize: '0.8rem', border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none', background: T.bg, color: T.fg, cursor: 'pointer' }}>
            <option value="">All Modules</option>
            <option value="team">Team</option>
            <option value="orders">Orders</option>
            <option value="products">Products</option>
            <option value="settings">Settings</option>
            <option value="ledger">Ledger</option>
          </select>
          <button onClick={() => fetchLogs(page)} style={{ border: `1px solid ${T.border}`, background: T.bg, color: T.fg, borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.muted, fontSize: '0.85rem' }}>Loading logs...</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: T.inputBg, borderRadius: 12, border: `1px dashed ${T.border}` }}>
          <Clock size={36} color={T.muted} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: T.fg, margin: '0 0 4px' }}>No activity logs yet</p>
          <p style={{ fontSize: '0.8rem', color: T.muted, margin: 0 }}>Activity will appear as you use the platform.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {logs.map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                <div style={{ marginTop: 2, flexShrink: 0 }}>{actionIcon(log.action)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.82rem', color: T.fg, margin: 0 }}>
                    <strong>{log.userName}</strong> {log.action} <span style={{ color: T.accent, fontWeight: 500 }}>{log.description}</span>
                  </p>
                  <p style={{ fontSize: '0.72rem', color: T.muted, margin: '4px 0 0', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>Module: {log.module}</span>
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ border: `1px solid ${T.border}`, background: T.bg, color: T.fg, borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>Previous</button>
              <span style={{ fontSize: '0.8rem', color: T.muted }}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ border: `1px solid ${T.border}`, background: T.bg, color: T.fg, borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}>Next</button>
            </div>
          )}

          <p style={{ fontSize: '0.75rem', color: T.muted, marginTop: 16, fontStyle: 'italic' }}>Architecture ready for CSV/PDF export functionality.</p>
        </>
      )}
    </div>
  );
}
