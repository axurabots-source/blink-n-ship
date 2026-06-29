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
} from 'lucide-react';

const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/orders', label: 'Booking', icon: PackageSearch },
    { href: '/products', label: 'Inventory', icon: Boxes },
    { href: '/ledger', label: 'Ledger', icon: BookOpen },
    { href: '/connect-courier', label: 'Courier', icon: Truck },
];

export default function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [hoveredLink, setHoveredLink] = useState<string | null>(null);
    const [logoutHovered, setLogoutHovered] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [accountType, setAccountType] = useState<string | null>(null);

    useEffect(() => {
        const cached = localStorage.getItem('bns_account_type');
        if (cached) setAccountType(cached);

        fetch('/api/profile')
            .then(r => r.json())
            .then(b => {
                if (b.profile?.accountType) {
                    setAccountType(b.profile.accountType);
                    localStorage.setItem('bns_account_type', b.profile.accountType);
                }
            })
            .catch(() => {});
    }, []);

    // Path change hone par close draw model
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Onboarding pages pe sidebar nahi dikhana
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
        }}>
            {/* Title / Logo */}
            <div style={{
                padding: '24px 20px 16px',
            }}>
                {/* Logo row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <motion.div
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                        whileHover="hover"
                    >
                        <motion.div
                            variants={{
                                hover: { x: [0, 6, -2, 0], transition: { duration: 0.6, ease: 'easeInOut' } }
                            }}
                        >
                            <Truck size={18} color="#CC785C" style={{ transform: 'scaleX(-1)' }} />
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
                    {/* Mobile close button */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', display: 'none' }}
                        className="mobile-close-btn"
                    >
                        <X size={18} />
                    </button>
                </div>
                {/* Portal badge — below logo */}
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
                padding: '12px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
            }}>
                {links.map((link) => {
                    const Icon = link.icon;
                    const active = pathname === link.href;
                    const isHovered = hoveredLink === link.href;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            onMouseEnter={() => setHoveredLink(link.href)}
                            onMouseLeave={() => setHoveredLink(null)}
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
                                background: active 
                                    ? '#CC785C' 
                                    : isHovered 
                                        ? 'rgba(255, 255, 255, 0.05)' 
                                        : 'transparent',
                                color: active 
                                    ? '#ffffff' 
                                    : isHovered 
                                        ? '#ffffff' 
                                        : '#a3a3a3',
                            }}
                        >
                            <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout bottom section */}
            <div style={{
                padding: '16px 12px',
                borderTop: '1px solid #1a1a1a',
            }}>
                <button
                    onClick={handleLogout}
                    onMouseEnter={() => setLogoutHovered(true)}
                    onMouseLeave={() => setLogoutHovered(false)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        width: '100%',
                        background: logoutHovered ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                        color: logoutHovered ? '#ef4444' : '#a3a3a3',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <LogOut size={16} strokeWidth={2} />
                    Logout
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Inject dynamic layouts globally */}
            <style dangerouslySetInnerHTML={{ __html: `
                main {
                    margin-left: 240px !important;
                    transition: margin-left 0.2s ease;
                }
                .mobile-toggle-btn {
                    display: none;
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
                    }
                    .mobile-close-btn {
                        display: block !important;
                    }
                    /* Page padding */
                    .bns-page { padding: 20px 16px !important; }
                    /* Grids → 1 col */
                    .bns-grid { grid-template-columns: 1fr !important; }
                    /* Stat cards → 2 col */
                    .bns-stat-grid { grid-template-columns: repeat(2,1fr) !important; }
                    /* Product grid → 1 col */
                    .bns-product-grid { grid-template-columns: 1fr !important; }
                    /* Tables → horizontal scroll */
                    .bns-table-wrap { overflow-x: auto !important; }
                    /* Font scale */
                    h1 { font-size: 1.2rem !important; }
                    .bns-subtext { font-size: 0.78rem !important; }
                    /* Header flex wrap */
                    .bns-header { flex-direction: column !important; gap: 12px !important; }
                    /* Toolbar wrap */
                    .bns-toolbar { flex-direction: column !important; align-items: flex-start !important; }
                    /* Form grids */
                    .bns-form-grid { grid-template-columns: 1fr !important; }
                    /* Chart height */
                    .bns-chart { height: 200px !important; }
                    /* Hide table on very small, use card list */
                    .bns-desktop-only { display: none !important; }
                }
            ` }} />

            {/* Mobile Toggle Button */}
            <button 
                onClick={() => setMobileOpen(true)}
                className="mobile-toggle-btn"
            >
                <Menu size={20} />
            </button>

            {/* Desktop Sidebar */}
            <aside 
                className="desktop-sidebar"
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

            {/* Mobile drawer with backdrop blur */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
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