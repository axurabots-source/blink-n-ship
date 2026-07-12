'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    PackageSearch,
    Boxes,
    BookOpen,
    Truck,
    LogOut,
    Menu,
    X,
    ChevronDown,
    Settings,
    FileText,
    MapPin,
    Globe,
    DollarSign,
    Package,
    Eye,
} from 'lucide-react';

function useMainLinks(accountType: string | null) {
    const links = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/orders', label: 'Booking', icon: PackageSearch },
        { href: '/ledger', label: 'Ledger', icon: BookOpen },
    ];
    if (accountType === 'inventory_holder') {
        links.splice(2, 0, { href: '/products', label: 'Inventory', icon: Boxes });
    }
    return links;
}

const courierSubLinks = [
    { href: '/courier', label: 'Overview', icon: LayoutDashboard },
    { href: '/courier/connect', label: 'Connect', icon: Globe },
    { href: '/courier/shipments', label: 'Shipments', icon: Package },
    { href: '/courier/pickup-locations', label: 'Pickup Locations', icon: MapPin },
    { href: '/courier/companies', label: 'Companies', icon: Truck },
    { href: '/courier/rate-cards', label: 'Rate Cards', icon: DollarSign },
    { href: '/courier/cities', label: 'Cities', icon: Globe },
];

export default function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [accountType, setAccountType] = useState<string | null>(null);

    const isCourierRoute = pathname.startsWith('/courier');
    const [courierOpen, setCourierOpen] = useState(isCourierRoute);

    useEffect(() => {
        if (isCourierRoute) setCourierOpen(true);
    }, [pathname, isCourierRoute]);

    useEffect(() => {
        // Always fetch from DB as source of truth to prevent stale localStorage
        // from showing wrong portal (e.g. inventory_holder for a reseller user)
        fetch('/api/profile')
            .then(r => r.json())
            .then(b => {
                if (b.profile?.accountType) {
                    setAccountType(b.profile.accountType);
                    // Sync localStorage with the confirmed DB value
                    localStorage.setItem('bns_account_type', b.profile.accountType);
                } else if (b.profile === null) {
                    // Profile doesn't exist yet — try again after a short delay
                    setTimeout(() => {
                        fetch('/api/profile')
                            .then(r => r.json())
                            .then(b2 => {
                                if (b2.profile?.accountType) {
                                    setAccountType(b2.profile.accountType);
                                    localStorage.setItem('bns_account_type', b2.profile.accountType);
                                }
                            })
                            .catch(() => {});
                    }, 2000);
                }
            })
            .catch(() => {
                // Fallback to localStorage only if network fails
                const cached = localStorage.getItem('bns_account_type');
                if (cached) setAccountType(cached);
            });
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const hideOn = ['/login', '/account-type'];
    if (hideOn.includes(pathname)) return null;

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push('/login');
    }

    const sidebarContent = (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            background: '#0a0a0a',
        }}>
            {/* Title / Logo */}
            <div style={{ padding: '24px 20px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <motion.div
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                        whileHover="hover"
                        onClick={() => router.push('/dashboard')}
                    >
                        <motion.div
                            variants={{
                                hover: { x: [0, 6, -2, 0], transition: { duration: 0.6, ease: 'easeInOut' } }
                            }}
                        >
                            <Truck size={18} color="#CC785C" style={{ transform: 'scaleX(-1)' }} aria-hidden="true" />
                        </motion.div>
                        <h1 style={{
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '1.15rem',
                            margin: 0,
                            letterSpacing: '-0.02em',
                        }}>
                            Blink N Ship
                        </h1>
                    </motion.div>
                    <button
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close navigation menu"
                        style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', display: 'none' }}
                        className="mobile-close-btn"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>
                {accountType && (
                    <div style={{
                        marginTop: 8,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        color: '#CC785C',
                        background: 'rgba(204,120,92,0.12)',
                        border: '1px solid rgba(204,120,92,0.2)',
                        borderRadius: 20,
                        padding: '3px 10px',
                        display: 'inline-block',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                    }}>
                        {accountType === 'inventory_holder' ? 'Inventory Holder Portal' : 'Reseller Portal'}
                    </div>
                )}
            </div>

            {/* Nav links */}
            <nav style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '12px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
            }}>
                {useMainLinks(accountType).map((link) => {
                    const Icon = link.icon;
                    const active = pathname === link.href;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            aria-current={active ? 'page' : undefined}
                            className="sidebar-link"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                textDecoration: 'none',
                                transition: 'all 0.15s ease',
                                background: active ? '#CC785C' : 'transparent',
                                color: active ? '#ffffff' : '#a3a3a3',
                             }}
                        >
                            <Icon size={16} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                            {link.label}
                        </Link>
                    );
                })}

                {/* Tracking — always visible, sits above Courier */}
                <Link
                    href="/tracking"
                    aria-current={pathname === '/tracking' ? 'page' : undefined}
                    className="sidebar-link"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                        background: pathname === '/tracking' ? '#CC785C' : 'transparent',
                        color: pathname === '/tracking' ? '#ffffff' : '#a3a3a3',
                    }}
                >
                    <Eye size={16} strokeWidth={pathname === '/tracking' ? 2.5 : 2} aria-hidden="true" />
                    Tracking
                </Link>

                {/* Collapsible Courier Group */}
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: '8px' }}>
                    <button
                        onClick={() => setCourierOpen(!courierOpen)}
                        aria-expanded={courierOpen}
                        aria-controls="courier-sublinks"
                        className="sidebar-courier-btn"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            background: isCourierRoute ? 'rgba(204, 120, 92, 0.1)' : 'transparent',
                            color: isCourierRoute ? '#CC785C' : '#a3a3a3',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Truck size={16} strokeWidth={2} aria-hidden="true" />
                            <span>Courier</span>
                        </div>
                        <ChevronDown 
                            size={14} 
                            aria-hidden="true"
                            style={{ 
                                transform: courierOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease'
                            }} 
                        />
                    </button>

                    <AnimatePresence initial={false}>
                        {courierOpen && (
                            <motion.div
                                id="courier-sublinks"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                style={{ overflow: 'hidden', paddingLeft: '8px' }}
                            >
                                <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '2px', 
                                    paddingTop: '4px',
                                    borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                                    marginLeft: '24px',
                                    paddingLeft: '12px'
                                }}>
                                    {courierSubLinks.map((subLink) => {
                                        const SubIcon = subLink.icon;
                                        const subActive = pathname === subLink.href;

                                        return (
                                            <Link
                                                key={subLink.href}
                                                href={subLink.href}
                                                aria-current={subActive ? 'page' : undefined}
                                                className="sidebar-link"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '8px 12px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 500,
                                                    textDecoration: 'none',
                                                    transition: 'all 0.15s ease',
                                                    background: subActive ? '#CC785C' : 'transparent',
                                                    color: subActive ? '#ffffff' : '#8a8a8a',
                                                }}
                                            >
                                                <SubIcon size={13} strokeWidth={subActive ? 2.2 : 1.8} aria-hidden="true" />
                                                {subLink.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </motion.div>
                         )}
                    </AnimatePresence>
                </div>
            </nav>

            {/* Settings link above Logout */}
            <div style={{ padding: '4px 12px 8px', flexShrink: 0 }}>
                <Link
                    href="/settings"
                    onClick={() => setMobileOpen(false)}
                    aria-current={pathname === '/settings' ? 'page' : undefined}
                    className="sidebar-link"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                        background: pathname === '/settings' ? '#CC785C' : 'transparent',
                        color: pathname === '/settings' ? '#ffffff' : '#a3a3a3',
                    }}
                >
                    <Settings size={16} strokeWidth={pathname === '/settings' ? 2.5 : 2} aria-hidden="true" />
                    Settings
                </Link>
            </div>

            {/* Logout bottom section */}
            <div style={{
                padding: '16px 12px',
                borderTop: '1px solid #1a1a1a',
                marginTop: 'auto',
                flexShrink: 0,
            }}>
                <button
                    onClick={handleLogout}
                    className="sidebar-link sidebar-logout"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        width: '100%',
                        background: 'transparent',
                        color: '#a3a3a3',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <LogOut size={16} strokeWidth={2} aria-hidden="true" />
                    Logout
                </button>
            </div>
        </div>
    );

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                main {
                    margin-left: 240px !important;
                    transition: margin-left 0.2s ease;
                }
                .mobile-toggle-btn {
                    display: none;
                }
                .sidebar-link:hover {
                    background: rgba(255, 255, 255, 0.05) !important;
                    color: #ffffff !important;
                }
                .sidebar-link[aria-current="page"]:hover {
                    background: #CC785C !important;
                    color: #ffffff !important;
                }
                .sidebar-courier-btn:hover {
                    background: rgba(255, 255, 255, 0.05) !important;
                }
                .sidebar-logout:hover {
                    background: rgba(239, 68, 68, 0.1) !important;
                    color: #ef4444 !important;
                }
                @media (max-width: 768px) {
                    main {
                        margin-left: 0 !important;
                        padding-top: 64px !important;
                    }
                    .desktop-sidebar {
                        display: none !important;
                    }
                    .mobile-toggle-btn {
                        display: flex !important;
                        position: fixed;
                        top: 12px;
                        left: 12px;
                        z-index: 90;
                        background: #0a0a0a;
                        border: 1px solid #1a1a1a;
                        color: #ffffff;
                        padding: 8px;
                        border-radius: 8px;
                        cursor: pointer;
                        align-items: center;
                        justify-content: center;
                        min-width: 44px;
                        min-height: 44px;
                    }
                    .mobile-close-btn {
                        display: block !important;
                    }
                    .bns-page { padding: 20px 16px !important; }
                    .bns-grid { grid-template-columns: 1fr !important; }
                    .bns-stat-grid { grid-template-columns: repeat(2,1fr) !important; }
                    .bns-product-grid { grid-template-columns: 1fr !important; }
                    .bns-table-wrap { overflow-x: auto !important; }
                    h1 { font-size: 1.2rem !important; }
                    .bns-subtext { font-size: 0.78rem !important; }
                    .bns-header { flex-direction: column !important; gap: 12px !important; }
                    .bns-toolbar { flex-direction: column !important; align-items: flex-start !important; }
                    .bns-form-grid { grid-template-columns: 1fr !important; }
                    .bns-chart { height: 200px !important; }
                    .bns-desktop-only { display: none !important; }
                }
            ` }} />

            <button 
                onClick={() => setMobileOpen(true)}
                className="mobile-toggle-btn"
                aria-label="Open navigation menu"
            >
                <Menu size={20} aria-hidden="true" />
            </button>

            <aside 
                className="desktop-sidebar"
                aria-label="Main navigation"
                style={{
                    width: '240px',
                    height: '100vh',
                    background: '#0a0a0a',
                    color: '#a3a3a3',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    borderRight: '1px solid #1a1a1a',
                    zIndex: 100,
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-geist-sans), sans-serif',
                }}
            >
                {sidebarContent}
            </aside>

            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                            role="presentation"
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: '#000000',
                                zIndex: 1000,
                                backdropFilter: 'blur(4px)',
                            }}
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Navigation menu"
                            style={{
                                width: '240px',
                                height: '100vh',
                                background: '#0a0a0a',
                                color: '#a3a3a3',
                                position: 'fixed',
                                left: 0,
                                top: 0,
                                zIndex: 1001,
                                boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
                                boxSizing: 'border-box',
                                fontFamily: 'var(--font-geist-sans), sans-serif',
                            }}
                        >
                            {sidebarContent}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
