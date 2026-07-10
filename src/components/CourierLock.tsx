'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Truck } from 'lucide-react';
import Link from 'next/link';

export default function CourierLock({ children }: { children: React.ReactNode }) {
    const [connected, setConnected] = useState<boolean | null>(null);

    useEffect(() => {
        fetch('/api/courier/account')
            .then(r => r.json())
            .then(data => {
                setConnected(!!(data.account && data.meta));
            })
            .catch(() => setConnected(false));
    }, []);

    if (connected === null) {
        return <div style={{ padding: '60px 40px', textAlign: 'center', color: '#737373', fontSize: '0.9rem' }}>Loading...</div>;
    }

    if (connected) {
        return <>{children}</>;
    }

    return (
        <div style={{ position: 'relative', minHeight: '60vh' }}>
            {/* Render children but invisible/blocked */}
            <div style={{ opacity: 0.15, pointerEvents: 'none', userSelect: 'none', filter: 'blur(2px)' }}>
                {children}
            </div>

            {/* Lock overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                        textAlign: 'center',
                        pointerEvents: 'auto',
                        background: '#ffffff',
                        border: '1px solid #e5e5e5',
                        borderRadius: 16,
                        padding: '40px 48px',
                        maxWidth: 440,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
                    }}
                >
                    <div style={{
                        width: 56, height: 56, borderRadius: 14,
                        background: '#fff5f0', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px',
                    }}>
                        <Truck size={24} color="#CC785C" style={{ transform: 'scaleX(-1)' }} />
                    </div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0a0a0a', margin: '0 0 8px' }}>
                        Courier Connection Required
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#737373', lineHeight: 1.6, margin: '0 0 24px' }}>
                        Please connect your Flaship account to access this feature.
                        Your orders, inventory, and all CRM tools will be available once connected.
                    </p>
                    <Link
                        href="/courier/connect"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '12px 28px', background: '#CC785C', color: '#fff',
                            border: 'none', borderRadius: 10, fontWeight: 600,
                            fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'none',
                        }}
                    >
                        Go to Connection Setup <ArrowRight size={16} />
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}