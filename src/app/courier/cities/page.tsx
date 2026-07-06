'use client';

import { useState, useEffect } from 'react';
import { Globe, RefreshCw, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

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

export default function OperationalCities() {
    const [cities, setCities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [search, setSearch] = useState('');
    const [lastSynced, setLastSynced] = useState<string | null>(null);

    // Sorting & Pagination state
    const [sortField, setSortField] = useState<'name' | 'code' | 'zone'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const loadCities = () => {
        setLoading(true);
        fetch('/api/courier/cities')
            .then(r => r.json())
            .then(data => {
                if (data.cities) {
                    setCities(data.cities);
                    if (data.cities.length > 0) {
                        // Find the latest syncedAt timestamp from the records
                        const dates = data.cities.map((c: any) => c.syncedAt || c.createdAt).filter(Boolean);
                        if (dates.length > 0) {
                            const latest = new Date(Math.max(...dates.map((d: any) => new Date(d).getTime())));
                            setLastSynced(latest.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }));
                        }
                    }
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        loadCities();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/courier/cities/sync', { method: 'POST' });
            if (res.ok) {
                loadCities();
            } else {
                alert('Failed to sync operational cities');
            }
        } catch (e) {
            alert('Failed to sync operational cities');
        } finally {
            setSyncing(false);
        }
    };

    const handleSort = (field: 'name' | 'code' | 'zone') => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Filter cities
    const filtered = cities.filter(c => {
        if (!search) return true;
        const term = search.toLowerCase();
        return (
            c.name?.toLowerCase().includes(term) ||
            c.code?.toLowerCase().includes(term) ||
            c.zone?.toLowerCase().includes(term)
        );
    });

    // Sort cities
    const sorted = [...filtered].sort((a, b) => {
        const aVal = String(a[sortField] || '').toLowerCase();
        const bVal = String(b[sortField] || '').toLowerCase();
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // Paginate cities
    const totalItems = sorted.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div
            style={{
                padding: '40px 48px',
                fontFamily: 'var(--font-geist-sans), sans-serif',
                color: T.fg,
                backgroundColor: T.bg,
                minHeight: '100vh',
            }}
            className="bns-page"
        >
            <style>{`
                .bns-cities-table { display: block; }
                .bns-cities-cards { display: none; }

                .bns-city-card {
                    border: 1.5px solid ${T.border};
                    border-radius: 12px;
                    padding: 14px 16px;
                    margin-bottom: 10px;
                    background: ${T.bg};
                    transition: border-color 0.18s;
                }
                .bns-city-card-row {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 8px;
                }
                .bns-city-card-name {
                    font-size: 0.88rem;
                    font-weight: 700;
                    color: ${T.fg};
                    margin-bottom: 4px;
                }
                .bns-city-card-code {
                    font-size: 0.76rem;
                    color: ${T.muted};
                    font-family: var(--font-geist-mono);
                    margin-bottom: 6px;
                }
                .bns-city-card-meta {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px 16px;
                    font-size: 0.76rem;
                    color: ${T.muted};
                }
                .bns-city-card-meta span { display: flex; align-items: center; gap: 4px; }

                @media (max-width: 768px) {
                    .bns-cities-table { display: none; }
                    .bns-cities-cards { display: block; margin-top: 16px; }
                }
            `}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }} className="bns-header">
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Operational Cities</h1>
                    <p style={{ color: T.muted, fontSize: '0.875rem' }} className="bns-subtext">
                        {cities.length > 0 
                            ? `Showing operational delivery destinations synced for your merchant account. Total: ${cities.length} cities.` 
                            : 'View available delivery destination cities, zones, and carrier network codes.'}
                    </p>
                    {lastSynced && (
                        <p style={{ fontSize: '0.75rem', color: T.accent, marginTop: 4, fontWeight: 500 }}>
                            Last synchronized: {lastSynced}
                        </p>
                    )}
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: `1px solid ${T.border}`,
                        padding: '10px 20px',
                        borderRadius: '8px',
                        background: '#fff',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: syncing ? 'not-allowed' : 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                    <span>{syncing ? 'Syncing...' : 'Sync Operational Cities'}</span>
                </button>
            </div>

            {/* Filter and stats row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }} className="bns-toolbar">
                <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
                    <Search size={16} color={T.muted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Search operational cities..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setCurrentPage(1);
                        }}
                        style={{ width: '100%', padding: '9px 12px 9px 38px', borderRadius: '8px', border: `1px solid ${T.border}`, fontSize: '0.85rem', outline: 'none', transition: 'border-color 0.15s ease' }}
                    />
                </div>
            </div>

            {/* Content Table / Empty States */}
            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: T.muted, fontSize: '0.9rem' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: T.accent }} />
                    Loading synced operational cities...
                </div>
            ) : cities.length === 0 ? (
                <div style={{ padding: '60px 40px', border: `1px solid ${T.border}`, borderRadius: '12px', textAlign: 'center', background: T.card }}>
                    <Globe size={40} style={{ margin: '0 auto 16px', color: T.muted, opacity: 0.6 }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '6px' }}>No operational cities have been synchronized yet.</h3>
                    <p style={{ color: T.muted, fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto 20px' }}>
                        Connect your merchant API key or click the sync button above to fetch all operational cities allowed for your account.
                    </p>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: T.accent,
                            color: '#fff',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                        Sync Operational Cities
                    </button>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ padding: '40px', border: `1px solid ${T.border}`, borderRadius: '12px', textAlign: 'center', color: T.muted }}>
                    No operational cities match your search.
                </div>
            ) : (
                <>
                <div className="bns-cities-table" style={{ border: `1px solid ${T.border}`, borderRadius: '10px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: T.card, borderBottom: `1px solid ${T.border}` }}>
                                <th 
                                    onClick={() => handleSort('name')} 
                                    style={{ padding: '12px 20px', fontWeight: 600, color: T.fg, cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        City Name <ArrowUpDown size={12} style={{ opacity: sortField === 'name' ? 1 : 0.4 }} />
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleSort('code')} 
                                    style={{ padding: '12px 20px', fontWeight: 600, color: T.fg, cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        City Code <ArrowUpDown size={12} style={{ opacity: sortField === 'code' ? 1 : 0.4 }} />
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleSort('zone')} 
                                    style={{ padding: '12px 20px', fontWeight: 600, color: T.fg, cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Zone <ArrowUpDown size={12} style={{ opacity: sortField === 'zone' ? 1 : 0.4 }} />
                                    </div>
                                </th>
                                <th style={{ padding: '12px 20px', fontWeight: 600, color: T.fg }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((c, idx) => (
                                <tr 
                                    key={c.id || idx} 
                                    style={{ borderBottom: idx === paginated.length - 1 ? 'none' : `1px solid ${T.border}`, transition: 'background-color 0.1s ease' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = T.accentLight}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <td style={{ padding: '14px 20px', fontWeight: 500, color: T.fg }}>{c.name}</td>
                                    <td style={{ padding: '14px 20px', color: T.muted }}>{c.code || '—'}</td>
                                    <td style={{ padding: '14px 20px', color: T.muted }}>{c.zone || '—'}</td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.72rem',
                                            fontWeight: 600,
                                            background: c.isActive ? '#e6f4ea' : '#fce8e6',
                                            color: c.isActive ? '#137333' : '#c5221f'
                                        }}>
                                            {c.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: `1px solid ${T.border}`, background: T.card }}>
                            <span style={{ fontSize: '0.75rem', color: T.muted }}>
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} cities
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        border: `1px solid ${T.border}`,
                                        background: '#fff',
                                        borderRadius: '6px',
                                        padding: '5px 8px',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === 1 ? 0.5 : 1
                                    }}
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        border: `1px solid ${T.border}`,
                                        background: '#fff',
                                        borderRadius: '6px',
                                        padding: '5px 8px',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === totalPages ? 0.5 : 1
                                    }}
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile Cards */}
                <div className="bns-cities-cards">
                    {paginated.map((c, idx) => (
                        <div key={c.id || idx} className="bns-city-card">
                            <div className="bns-city-card-row">
                                <div>
                                    <div className="bns-city-card-name">{c.name}</div>
                                    <div className="bns-city-card-code">{c.code || '—'}</div>
                                    <div className="bns-city-card-meta">
                                        <span>📍 {c.zone || '—'}</span>
                                        <span>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.72rem',
                                                fontWeight: 600,
                                                background: c.isActive ? '#e6f4ea' : '#fce8e6',
                                                color: c.isActive ? '#137333' : '#c5221f'
                                            }}>
                                                {c.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </>
            )}
        </div>
    );
}
